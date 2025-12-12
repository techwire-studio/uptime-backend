import {
  StatusPageAccessLevelEnum,
  StatusPageStatusEnum
} from '@/types/status';
import { z } from 'zod';

export const createStatusPageSchema = z.object({
  workspace_id: z.string().uuid().or(z.string()),
  name: z.string().min(1, 'Name is required'),
  custom_domain: z.string().url().nullable(),
  monitor_ids: z.array(z.string().uuid())
});

export const updateStatusPageSchema = createStatusPageSchema.partial().extend({
  access_level: z.enum(StatusPageAccessLevelEnum).optional(),
  status: z.enum(StatusPageStatusEnum).optional()
});
