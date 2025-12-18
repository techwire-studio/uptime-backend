import { performance } from 'perf_hooks';
import fetch from 'node-fetch';
import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns';
import { URL } from 'node:url';
import { HttpMonitorCheckResult, MonitorCheckStatus } from '@/types/monitor';

/**
 * Executes an HTTP monitoring check for a given monitor configuration.
 *
 * This function performs:
 *   1. DNS lookup timing
 *   2. HTTP fetch request with timeout support
 *   3. Response body download timing
 *
 * The result is formatted to match the `monitor_checks` Prisma model.
 *
 * @param monitor - A monitor object containing URL and timeout configuration.
 * @returns A structured monitor check result.
 */
export const runHttpMonitor = async (monitor: {
  url: string;
  timeout_ms?: number;
  expected_status?: number;
}): Promise<HttpMonitorCheckResult> => {
  const monitorUrl = new URL(monitor.url);
  const timeoutMilliseconds = monitor.timeout_ms ?? 5000;

  let dns_lookup_ms: number | null = null,
    connect_ms: number | null = null,
    download_ms: number | null = null;

  const totalStartTime = performance.now();

  const requestHeaders = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    'Host': monitorUrl.host,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.8',
    'Cache-Control': 'no-cache',
    'Connection': 'close'
  };

  try {
    // -------------------------------------------------------------
    // 1. DNS Lookup Timing
    // -------------------------------------------------------------
    const dnsStartTime = performance.now();
    await new Promise<void>((resolve, reject) => {
      dns.lookup(monitorUrl.hostname, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    dns_lookup_ms = Math.round(performance.now() - dnsStartTime);

    // -------------------------------------------------------------
    // 2. CONNECT TIME (TCP handshake)
    // -------------------------------------------------------------
    connect_ms = await new Promise<number>((resolve, reject) => {
      const isHttps = monitorUrl.protocol === 'https:';

      const mod = isHttps ? https : http;

      const req = mod.get(
        {
          host: monitorUrl.hostname,
          port: monitorUrl.port || (isHttps ? 443 : 80),
          timeout: timeoutMilliseconds
        },
        () => {}
      );

      const start = performance.now();

      req.on('socket', (socket) => {
        socket.on('connect', () => {
          resolve(Math.round(performance.now() - start));
          req.destroy();
        });
      });

      req.on('error', (err) => reject(err));
    });

    // -------------------------------------------------------------
    // 3. HTTP Request Using Fetch with Timeout
    // -------------------------------------------------------------
    const abortController = new AbortController();
    const timeoutHandle = setTimeout(() => {
      abortController.abort();
    }, timeoutMilliseconds);

    const response = await fetch(monitorUrl, {
      signal: abortController.signal,
      headers: requestHeaders
    });

    clearTimeout(timeoutHandle);

    // -------------------------------------------------------------
    // 4. Body Download Timing
    // -------------------------------------------------------------
    const downloadStartTime = performance.now();
    const responseText = await response.text();
    download_ms = Math.round(performance.now() - downloadStartTime);

    const totalTime = Math.round(performance.now() - totalStartTime);

    return {
      status: MonitorCheckStatus.UP,
      success: true,
      http_status: response.status,
      response_time_ms: totalTime,
      request_headers: requestHeaders,
      response_body: responseText.slice(0, 5000), // Prevent oversized entries
      response_headers: Object.fromEntries(response.headers.entries()),
      response_size_bytes: Buffer.byteLength(responseText),
      error_message: null,
      connect_ms,
      dns_lookup_ms,
      download_ms
    };
  } catch (error: any) {
    const totalTime = Math.round(performance.now() - totalStartTime);

    return {
      status: MonitorCheckStatus.DOWN,
      success: false,
      http_status: null,
      request_headers: requestHeaders,
      response_time_ms: totalTime,
      connect_ms,
      response_body: null,
      response_headers: null,
      response_size_bytes: null,
      error_message: error?.message ?? 'Unknown error occurred',
      dns_lookup_ms,
      download_ms
    };
  }
};

export async function sendHttp({
  url,
  payload,
  headers
}: {
  url: string;
  payload: unknown;
  headers?: Record<string, string>;
}): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      signal: controller.signal
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Request failed: ${response.status} ${text}`);
    }
  } finally {
    clearTimeout(timeoutId);
  }
}
