import { z } from 'zod';

export const monitorSchema = z.object({
  type: z.string(),
  workspace_id: z.string().uuid().min(1, 'Workspace ID is required'),
  name: z.string().trim().min(1, 'Name is required').nullable(),
  url: z.string().trim().nullable(),
  tags: z.array(z.string().trim()).default([]),
  interval_seconds: z
    .number()
    .int('Interval must be an integer')
    .min(1, 'Interval must be at least 1 second')
    .default(60),
  timeout_ms: z
    .number()
    .int('Timeout must be an integer')
    .min(1, 'Timeout must be at least 1 ms')
    .default(5000),
  records: z
    .object({
      type: z.string(),
      value: z.string()
    })
    .array()
    .optional()
    .nullable(),
  expected_status: z.number().int().nullable().optional(),
  check_regions: z.string().trim().nullable().optional(),
  grace_period: z.number().int().nullable().optional(),
  keyword: z.string().nullable().optional(),
  keyword_match_type: z.string().nullable().optional(),
  port: z.number().int().nullable().optional(),
  check_ssl_errors: z.boolean().default(false),
  ssl_expiry_reminders: z.boolean().default(false),
  domain_expiry_reminders: z.boolean().default(false),
  alert_channels: z.array(
    z
      .object({
        email: z.string().email().optional(),
        number: z.string().optional()
      })
      .refine((data) => data.email || data.number, {
        message: 'Either email or number must be provided'
      })
  )
});

export const createMonitorSchema = z.array(monitorSchema);

export const updateMonitorSchema = monitorSchema.partial();
