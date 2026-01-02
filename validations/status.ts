import {
  StatusPageAccessLevelEnum,
  StatusPageStatusEnum
} from '@/types/status';
import { z } from 'zod';

export const createStatusPageSchema = z.object({
  name: z.string().min(1),
  workspace_id: z.string(),
  custom_domain: z.string().nullable(),
  monitor_ids: z.union([
    z.array(z.string()),
    z.string().transform((v) => JSON.parse(v))
  ]),
  configs: z.union([
    z.object({}).passthrough(),
    z.string().transform((v) => JSON.parse(v))
  ])
});

export const updateStatusPageSchema = createStatusPageSchema.partial().extend({
  access_level: z.enum(StatusPageAccessLevelEnum).optional(),
  status: z.enum(StatusPageStatusEnum).optional()
});
