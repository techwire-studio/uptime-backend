import { getActivityLogsByEntity } from '@/controllers/activity';
import { getWorkspaceIncidents } from '@/controllers/incident';
import { getWorkspaceMonitors } from '@/controllers/monitor';
import { getWorkspaceStatusPages } from '@/controllers/status';
import {
  createSubscription,
  getSubscriptionStatus,
  changeSubscriptionPlan,
  getWorkspaceSubscriptionInvoices
} from '@/controllers/subscription';
import {
  createAlertChannels,
  getAlertChannels,
  getAlertRules,
  getWorkspaceTags,
  getUserWorkspaces,
  updateAlertRule,
  updateWorkspaceTags,
  getWorkspaceMembers,
  deleteWorkspaceMember,
  inviteTeamMember,
  updateWorkspaceMember
} from '@/controllers/workspace';
import { authenticationMiddleware } from '@/middlewares/auth';
import { validateRequestPayload } from '@/middlewares/validation';
import {
  createSubscriptionSchema,
  changeSubscriptionPlanSchema
} from '@/validations/subscription';
import {
  createAlertChannelSchema,
  inviteWorkspaceMemberSchema,
  updateTagsSchema,
  updateWorkspaceMemberSchema
} from '@/validations/workspace';
import express from 'express';

const router = express.Router();

router.use(authenticationMiddleware);

router.get('/:workspaceId/monitors', getWorkspaceMonitors);
router.get('/:workspaceId/incidents', getWorkspaceIncidents);
router.get('/:workspaceId/subscription', getSubscriptionStatus);
router.get('/:workspaceId/invoices', getWorkspaceSubscriptionInvoices);
router.get('/:workspaceId/status-pages', getWorkspaceStatusPages);
router.get('/:userId', getUserWorkspaces);
router.get('/:workspaceId/members', getWorkspaceMembers);
router.delete('/:workspaceId/members/:memberId', deleteWorkspaceMember);
router.post(
  '/:workspaceId/subscriptions',
  validateRequestPayload(createSubscriptionSchema),
  createSubscription
);
router.post(
  '/:workspaceId/invite',
  validateRequestPayload(inviteWorkspaceMemberSchema),
  inviteTeamMember
);
router.patch(
  '/:workspaceId/members',
  validateRequestPayload(updateWorkspaceMemberSchema),
  updateWorkspaceMember
);
router.post(
  '/:workspaceId/subscriptions/upgrade',
  validateRequestPayload(changeSubscriptionPlanSchema),
  changeSubscriptionPlan
);
router
  .route('/:workspaceId/tags')
  .get(getWorkspaceTags)
  .patch(validateRequestPayload(updateTagsSchema), updateWorkspaceTags);
router
  .route('/:workspaceId/integrations')
  .get(getAlertChannels)
  .post(validateRequestPayload(createAlertChannelSchema), createAlertChannels);
router.get('/:workspaceId/rules', getAlertRules);
router.patch('/alert-rules/:ruleId', updateAlertRule);
router.get('/:workspaceId/activity-logs/:entityId', getActivityLogsByEntity);

export default router;
