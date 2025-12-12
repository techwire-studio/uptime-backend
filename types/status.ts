import {
  createStatusPageSchema,
  updateStatusPageSchema
} from '@/validations/status';
import z from 'zod';

export type CreateStatusPageType = z.infer<typeof createStatusPageSchema>;

export type UpdateStatusPageType = z.infer<typeof updateStatusPageSchema>;

export enum StatusPageAccessLevelEnum {
  PUBLIC = 'public',
  PRIVATE = 'private'
}

export enum StatusPageStatusEnum {
  PUBLISHED = 'published',
  UNPUBLISHED = 'unpublished'
}
