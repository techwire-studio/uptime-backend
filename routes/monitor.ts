import { getIncidentByMonitorId } from '@/controllers/incident';
import {
  createNewMonitor,
  getMonitorById,
  updateMonitorById,
  deleteMonitors,
  resetMonitorStats,
  getMonitorsBySelect,
  getChecks,
  updateHeartbeat,
  getDomainAndSSL,
  testNotifications
} from '@/controllers/monitor';
import { authenticationMiddleware } from '@/middlewares/auth';
import { validateRequestPayload } from '@/middlewares/validation';
import {
  createMonitorSchema,
  updateMonitorSchema
} from '@/validations/monitor';
import express from 'express';

const router = express.Router();

router.get('/select', authenticationMiddleware, getMonitorsBySelect);
router.get('/checks', getChecks);
router.post(
  '/create',
  authenticationMiddleware,
  validateRequestPayload(createMonitorSchema),
  createNewMonitor
);
router.get('/:id/incidents', getIncidentByMonitorId);
router.get('/:id/domain-ssl', getDomainAndSSL);
router.post('/:monitorId/heartbeat', updateHeartbeat);
router.post('/reset-stats', authenticationMiddleware, resetMonitorStats);
router.post('/test-notification', authenticationMiddleware, testNotifications);
router.patch(
  '/:id',
  authenticationMiddleware,
  validateRequestPayload(updateMonitorSchema),
  updateMonitorById
);
router.get('/:id', authenticationMiddleware, getMonitorById);
router.delete('/', authenticationMiddleware, deleteMonitors);

export default router;
