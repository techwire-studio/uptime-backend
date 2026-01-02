import { z } from 'zod';

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty'),
  workspace_id: z.string(),
  publishOnStatusPage: z.boolean()
});

export const updateCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty'),
  publishOnStatusPage: z.boolean().optional()
});
