import { createAlertChannelSchema } from '@/validations/workspace';
import z from 'zod';

export type CreateAlertChannelType = z.infer<typeof createAlertChannelSchema>;

export enum WorkspaceMembers {
  OWNER = 'owner',
  MEMBER = 'member'
}
