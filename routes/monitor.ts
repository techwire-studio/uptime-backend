import { getIncidentByMonitorId } from '@/controllers/incident';
import {
  createNewMonitor,
  getMonitorById,
  updateMonitorById,
  deleteMonitors,
  resetMonitorStats,
  getMonitorsBySelect
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
router.post(
  '/new',
  authenticationMiddleware,
  validateRequestPayload(createMonitorSchema),
  createNewMonitor
);
router.patch(
  '/:id',
  authenticationMiddleware,
  validateRequestPayload(updateMonitorSchema),
  updateMonitorById
);
router.get('/:id', authenticationMiddleware, getMonitorById);
router.delete('/', authenticationMiddleware, deleteMonitors);
router.get('/:id/incidents', getIncidentByMonitorId);
router.post('/reset-stats', authenticationMiddleware, resetMonitorStats);

export default router;
