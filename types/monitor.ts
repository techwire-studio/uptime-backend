import { monitors } from '@/prisma/generated/prisma/client';
import {
  createMonitorSchema,
  updateMonitorSchema
} from '@/validations/monitor';
import z from 'zod';

export enum MonitorTypeEnum {
  HTTP = 'http',
  HEARTBEAT = 'heartbeat'
}

export enum MonitorOverallStatus {
  HEALTHY = 'healthy',
  UNHEALTHY = 'unhealthy',
  PAUSED = 'paused',
  PREPARING = 'preparing'
}

export enum MonitorCheckStatus {
  UP = 'UP',
  DOWN = 'DOWN'
}

export interface HttpMonitorCheckResult {
  status: MonitorCheckStatus;
  success: boolean;
  http_status: number | null;
  response_time_ms: number | null;
  error_message: string | null;
  dns_lookup_ms: number | null;
  connect_ms: number | null;
  download_ms: number | null;
  response_size_bytes: number | null;
  response_headers: Record<string, unknown> | null;
  request_headers: Record<string, unknown> | null;
  response_body: string | null;
}

export type MonitorsType = monitors;

export type CreateMonitorSchemaType = z.infer<typeof createMonitorSchema>;

export type UpdateMonitorSchemaType = z.infer<typeof updateMonitorSchema>;

export enum MonitorNotifyEventEnum {
  UP = 'UP',
  DOWN = 'DOWN',
  SSL_EXPIRY = 'SSL_EXPIRY',
  DOMAIN_EXPIRY = 'DOMAIN_EXPIRY'
}
