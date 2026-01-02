import ping from 'ping';
import { performance } from 'perf_hooks';

export const runPingMonitor = async (monitor: {
  host: string;
  timeout_ms?: number;
  packets?: number;
}) => {
  const timeoutSeconds = Math.ceil((monitor.timeout_ms ?? 5000) / 1000);
  const packets = monitor.packets ?? 3;
  const extraArgs =
    process.platform === 'win32'
      ? ['-n', packets.toString()]
      : ['-c', packets.toString()];

  const startTime = performance.now();

  try {
    const result = await ping.promise.probe(monitor.host, {
      timeout: timeoutSeconds,
      extra: extraArgs
    });

    return {
      status: result.alive ? 'UP' : 'DOWN',
      success: result.alive,
      host: monitor.host,
      packet_loss: result.packetLoss,
      min_ms: result.min ? parseFloat(result.min) : null,
      max_ms: result.max ? parseFloat(result.max) : null,
      avg_ms: result.avg ? parseFloat(result.avg) : null,
      response_time_ms: Math.round(performance.now() - startTime),
      error_message: result.alive ? null : 'Host unreachable'
    };
  } catch (error: any) {
    return {
      status: 'DOWN',
      success: false,
      host: monitor.host,
      packet_loss: null,
      min_ms: null,
      max_ms: null,
      avg_ms: null,
      response_time_ms: Math.round(performance.now() - startTime),
      error_message: error?.message ?? 'Ping failed'
    };
  }
};
