import { getWorkspaceIncidents } from '@/controllers/incident';
import { getWorkspaceMonitors } from '@/controllers/monitor';
import { getWorkspaceStatusPages } from '@/controllers/status';
import {
  createAlertChannels,
  getAlertChannels,
  getAlertRules,
  getUserWorkspaces,
  updateAlertRule
} from '@/controllers/workspace';
import { authenticationMiddleware } from '@/middlewares/auth';
import { validateRequestPayload } from '@/middlewares/validation';
import { createAlertChannelSchema } from '@/validations/workspace';
import express from 'express';

const router = express.Router();

router.get(
  '/:workspaceId/monitors',
  authenticationMiddleware,
  getWorkspaceMonitors
);
router.get(
  '/:workspaceId/incidents',
  authenticationMiddleware,
  getWorkspaceIncidents
);
router.get(
  '/:workspaceId/status-pages',
  authenticationMiddleware,
  getWorkspaceStatusPages
);
router.get('/:userId', authenticationMiddleware, getUserWorkspaces);
router.get(
  '/:workspaceId/integrations',
  authenticationMiddleware,
  getAlertChannels
);
router.get('/:workspaceId/rules', authenticationMiddleware, getAlertRules);
router.patch('/alert-rules/:ruleId', authenticationMiddleware, updateAlertRule);
router.post(
  '/:workspaceId/integrations',
  authenticationMiddleware,
  validateRequestPayload(createAlertChannelSchema),
  createAlertChannels
);

export default router;
