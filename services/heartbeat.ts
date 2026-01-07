import { performance } from 'perf_hooks';
import { BaseMonitorCheckResult, MonitorCheckStatus } from '@/types/monitor';

export const runHeartbeatMonitor = async (monitor: {
  interval_seconds: number; // expected heartbeat interval
  last_heartbeat?: number; // timestamp in milliseconds
  grace_period_seconds?: number; // optional extra time before marking DOWN
}): Promise<BaseMonitorCheckResult> => {
  const startTime = performance.now();

  const gracePeriodMs = (monitor.grace_period_seconds ?? 0) * 1000;
  const intervalMs = monitor.interval_seconds * 1000;
  const now = Date.now();

  let isHealthy = false;
  let errorMessage: string | null = null;

  if (monitor.last_heartbeat == null) {
    // No heartbeat received yet
    isHealthy = false;
    errorMessage = 'No heartbeat received yet';
  } else {
    const timeSinceLastHeartbeat = now - monitor.last_heartbeat;

    if (timeSinceLastHeartbeat <= intervalMs + gracePeriodMs) {
      isHealthy = true;
    } else {
      isHealthy = false;
      errorMessage = 'Request not received';
    }
  }

  const totalTime = Math.round(performance.now() - startTime);

  return {
    status: isHealthy ? MonitorCheckStatus.UP : MonitorCheckStatus.DOWN,
    success: isHealthy,
    response_time_ms: totalTime,
    error_message: errorMessage,
    http_status: null,
    request_headers: null,
    response_body: null,
    response_headers: null,
    response_size_bytes: null,
    connect_ms: null,
    dns_lookup_ms: null,
    download_ms: null
  };
};
