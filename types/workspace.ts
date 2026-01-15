import {
  createAlertChannelSchema,
  createClientSchema,
  inviteWorkspaceMemberSchema,
  updateTagsSchema,
  updateWorkspaceMemberSchema
} from '@/validations/workspace';
import z from 'zod';

export type CreateAlertChannelType = z.infer<typeof createAlertChannelSchema>;

export enum WorkspaceMembersRole {
  OWNER = 'owner',
  NOTIFY_ONLY = 'notify-only',
  READER = 'reader',
  EDITOR = 'editor',
  ADMIN = 'admin'
}

export type UpdateTagsType = z.infer<typeof updateTagsSchema>;

export type InviteWorkspaceMemberType = z.infer<
  typeof inviteWorkspaceMemberSchema
>;

export type UpdateWorkspaceMemberType = z.infer<
  typeof updateWorkspaceMemberSchema
>;

export enum MaintenanceProjectStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ON_HOLD = 'ON_HOLD'
}

export type CreateClientType = z.infer<typeof createClientSchema>;
