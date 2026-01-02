import {
  createStatusPageSchema,
  updateStatusPageSchema
} from '@/validations/status';
import z from 'zod';

export type CreateStatusPageType = z.infer<typeof createStatusPageSchema> & {
  configs: Record<string, string>;
};

export type UpdateStatusPageType = z.infer<typeof updateStatusPageSchema> & {
  configs: Record<string, string>;
};

export enum StatusPageAccessLevelEnum {
  PUBLIC = 'public',
  PRIVATE = 'private'
}

export enum StatusPageStatusEnum {
  PUBLISHED = 'published',
  UNPUBLISHED = 'unpublished'
}
