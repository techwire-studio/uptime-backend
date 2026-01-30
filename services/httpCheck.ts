import { performance } from 'perf_hooks';
import fetch from 'node-fetch';
import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns';
import { URL } from 'node:url';
import {
  BaseMonitorCheckResult,
  KeywordConditionEnum,
  MonitorCheckStatus
} from '@/types/monitor';

export const runHttpMonitor = async (monitor: {
  url: string;
  timeout_ms?: number;
  keyword?: string;
  keyword_match_type?: KeywordConditionEnum;
  method?: 'GET' | 'POST';
  body?: Record<string, string>;
  expected_status?: string[];
  headers?: Record<string, string>;
}): Promise<BaseMonitorCheckResult> => {
  const monitorUrl = new URL(monitor.url);
  const timeoutMilliseconds = monitor.timeout_ms ?? 5000;

  let dns_lookup_ms: number | null = null;
  let connect_ms: number | null = null;
  let download_ms: number | null = null;

  const totalStartTime = performance.now();

  const requestHeaders = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    'Accept': '*/*',
    'Connection': 'close'
  };

  if (monitor.headers && typeof monitor.headers === 'object') {
    for (const [key, value] of Object.entries(monitor.headers)) {
      requestHeaders[key] = value;
    }
  }

  try {
    const dnsStart = performance.now();
    await new Promise<void>((resolve, reject) => {
      dns.lookup(monitorUrl.hostname, (err) => (err ? reject(err) : resolve()));
    });
    dns_lookup_ms = Math.round(performance.now() - dnsStart);

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

      req.on('error', reject);
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMilliseconds);

    const response = await fetch(monitorUrl, {
      method: monitor.method ?? 'GET',
      headers: requestHeaders,
      body:
        monitor.method === 'POST' && monitor.body != null
          ? JSON.stringify(monitor.body)
          : null,
      signal: controller.signal
    });

    clearTimeout(timer);

    const downloadStart = performance.now();
    const responseText = await response.text();
    download_ms = Math.round(performance.now() - downloadStart);

    const totalTime = Math.round(performance.now() - totalStartTime);

    let failed = false;
    let error_message: string | null = null;
    if (monitor.expected_status != null) {
      const expected = Array.isArray(monitor.expected_status)
        ? monitor.expected_status
        : [monitor.expected_status];

      const statusMatched = expected.some((statusPattern) => {
        if (typeof statusPattern === 'string' && statusPattern.endsWith('xx')) {
          const prefix = parseInt(statusPattern.charAt(0), 10);
          return Math.floor(response.status / 100) === prefix;
        } else {
          return response.status === Number(statusPattern);
        }
      });

      if (!statusMatched) {
        failed = true;
        error_message = `Unexpected status ${response.status}`;
      }
    }

    if (monitor.keyword && monitor.keyword_match_type) {
      const exists = responseText.includes(monitor.keyword);

      if (
        (monitor.keyword_match_type === KeywordConditionEnum.EXISTS &&
          !exists) ||
        (monitor.keyword_match_type === KeywordConditionEnum.NOT_EXISTS &&
          exists)
      ) {
        failed = true;
        error_message =
          monitor.keyword_match_type === KeywordConditionEnum.EXISTS
            ? `Keyword "${monitor.keyword}" not found`
            : `Keyword "${monitor.keyword}" should not exist`;
      }
    }

    return {
      status: failed ? MonitorCheckStatus.DOWN : MonitorCheckStatus.UP,
      success: !failed,
      http_status: response.status,
      response_time_ms: totalTime,
      request_headers: requestHeaders,
      response_body: responseText.slice(0, 5000),
      response_headers: Object.fromEntries(response.headers.entries()),
      response_size_bytes: Buffer.byteLength(responseText),
      error_message,
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
      error_message: error?.message ?? 'Unknown error',
      dns_lookup_ms,
      download_ms
    };
  }
};
