import { monitors } from '@/prisma/generated/prisma/client';
import {
  createMonitorSchema,
  updateMonitorSchema
} from '@/validations/monitor';
import z from 'zod';

export enum MonitorTypeEnum {
  HTTP = 'http',
  HEARTBEAT = 'heartbeat',
  PING = 'ping',
  PORT = 'port',
  DNS = 'dns',
  KEYWORD = 'keyword',
  AI_SYNTHETIC = 'ai_synthetic',
  AI_HEALTH_CHECK = 'ai_health'
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

export interface BaseMonitorCheckResult {
  status: string;
  success: boolean;
  response_time_ms?: number | null;
  error_message?: string | null;

  dns_lookup_ms?: number | null;
  connect_ms?: number | null;
  ssl_handshake_ms?: number | null;
  download_ms?: number | null;

  http_status?: number | null;
  response_size_bytes?: number | null;
  response_headers?: Record<string, any> | null;
  request_headers?: Record<string, any> | null;
  response_body?: string | null;
}

export type MonitorsType = monitors;

export type CreateMonitorSchemaType = z.infer<typeof createMonitorSchema>;

export type UpdateMonitorSchemaType = z.infer<typeof updateMonitorSchema> & {
  next_run_at?: Date | null;
  interval_seconds?: number;
  status?: string;
  is_active?: boolean;
};

export enum MonitorNotifyEventEnum {
  UP = 'UP',
  DOWN = 'DOWN',
  SSL_EXPIRY = 'SSL_EXPIRY',
  DOMAIN_EXPIRY = 'DOMAIN_EXPIRY'
}

export enum KeywordConditionEnum {
  EXISTS = 'exists',
  NOT_EXISTS = 'not_exists'
}

export type DnsRecordEnum =
  | 'A'
  | 'AAAA'
  | 'CNAME'
  | 'MX'
  | 'TXT'
  | 'NS'
  | 'SOA'
  | 'SRV'
  | 'PTR';

export type DnsRecordType = {
  type: DnsRecordEnum;
  value: string;
};
