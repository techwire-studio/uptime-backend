import { MonitorOverallStatus } from '@/types/monitor';
import { z } from 'zod';

export const createMonitorSchema = z.object({
  workspace_id: z.string().uuid().or(z.string()),
  name: z.string(),
  url: z.string().url(),
  type: z.string(),
  tags: z.string().array(),
  interval_seconds: z.number().int().default(60),
  timeout_ms: z.number().int().default(5000),
  expected_status: z.number().int().nullable().optional(),
  check_regions: z.string().nullable().optional(),
  status: z.string().default(MonitorOverallStatus.HEALTHY),
  last_response_time_ms: z.number().int().nullable().optional(),
  last_checked_at: z.coerce.date().nullable().optional(),
  next_run_at: z.coerce.date().nullable().optional(),
  is_active: z.boolean().default(true),
  consecutive_failures: z.number().int().default(2),
  max_retries: z.number().int().default(0),
  alert_channels: z.object({
    email: z.boolean().default(true),
    sms: z.boolean().default(false),
    voice: z.boolean().default(false),
    push: z.boolean().default(false)
  })
});

export const updateMonitorSchema = createMonitorSchema.partial();
