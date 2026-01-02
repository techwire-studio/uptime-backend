import {
  createCommentSchema,
  deleteCommentSchema,
  updateCommentSchema
} from '@/validations/activity';
import z from 'zod';

export type CreateCommentType = z.infer<typeof createCommentSchema>;

export type UpdateCommentType = z.infer<typeof updateCommentSchema>;

export type DeleteCommentType = z.infer<typeof deleteCommentSchema>;

export interface CreateActivityLogInput {
  workspace_id: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  actor_user_id?: string | null;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
}
