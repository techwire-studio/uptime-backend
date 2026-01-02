import { getActivityLogsByEntity } from '@/controllers/activity';
import { getWorkspaceIncidents } from '@/controllers/incident';
import { getWorkspaceMonitors } from '@/controllers/monitor';
import { getWorkspaceStatusPages } from '@/controllers/status';
import {
  createAlertChannels,
  getAlertChannels,
  getAlertRules,
  getWorkspaceTags,
  getUserWorkspaces,
  updateAlertRule,
  updateWorkspaceTags
} from '@/controllers/workspace';
import { authenticationMiddleware } from '@/middlewares/auth';
import { validateRequestPayload } from '@/middlewares/validation';
import {
  createAlertChannelSchema,
  updateTagsSchema
} from '@/validations/workspace';
import express from 'express';

const router = express.Router();

router.use(authenticationMiddleware);

router.get('/:workspaceId/monitors', getWorkspaceMonitors);
router.get('/:workspaceId/incidents', getWorkspaceIncidents);
router.get('/:workspaceId/status-pages', getWorkspaceStatusPages);
router
  .route('/:workspaceId/tags')
  .get(getWorkspaceTags)
  .patch(validateRequestPayload(updateTagsSchema), updateWorkspaceTags);
router.get('/:userId', getUserWorkspaces);
router
  .route('/:workspaceId/integrations')
  .get(getAlertChannels)
  .post(validateRequestPayload(createAlertChannelSchema), createAlertChannels);

router.get('/:workspaceId/rules', getAlertRules);
router.patch('/alert-rules/:ruleId', updateAlertRule);
router.get('/:workspaceId/activity-logs/:entityId', getActivityLogsByEntity);

export default router;
