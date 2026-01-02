import net from 'net';
import dns from 'dns';
import { performance } from 'perf_hooks';

export const runPortMonitor = async (monitor: {
  host: string;
  port: number;
  timeout_ms?: number;
}) => {
  const timeoutMilliseconds = monitor.timeout_ms ?? 5000;
  const startTime = performance.now();

  let dns_lookup_ms: number | null = null;
  let connect_ms: number | null = null;

  try {
    // -------------------------------------------------------------
    // 1. DNS Lookup (if hostname)
    // -------------------------------------------------------------
    if (!net.isIP(monitor.host)) {
      const dnsStart = performance.now();
      await new Promise<void>((resolve, reject) => {
        dns.lookup(monitor.host, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      dns_lookup_ms = Math.round(performance.now() - dnsStart);
    }

    // -------------------------------------------------------------
    // 2. TCP Connect Timing
    // -------------------------------------------------------------
    connect_ms = await new Promise<number>((resolve, reject) => {
      const socket = new net.Socket();
      const connectStart = performance.now();

      const onError = (err: Error) => {
        socket.destroy();
        reject(err);
      };

      socket.setTimeout(timeoutMilliseconds);
      socket.once('error', onError);

      socket.connect(monitor.port, monitor.host, () => {
        connect_ms = Math.round(performance.now() - connectStart);
        socket.end();
        resolve(connect_ms);
      });

      socket.once('timeout', () => {
        socket.destroy();
        reject(new Error('Connection timeout'));
      });
    });

    return {
      status: 'UP',
      success: true,
      host: monitor.host,
      port: monitor.port,
      dns_lookup_ms,
      connect_ms,
      response_time_ms: Math.round(performance.now() - startTime),
      error_message: null
    };
  } catch (error: any) {
    return {
      status: 'DOWN',
      success: false,
      host: monitor.host,
      port: monitor.port,
      dns_lookup_ms,
      connect_ms,
      response_time_ms: Math.round(performance.now() - startTime),
      error_message: error?.message ?? 'Port check failed'
    };
  }
};
