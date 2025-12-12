import { getIncidentByMonitorId } from '@/controllers/incident';
import {
  createNewMonitor,
  getMonitorById,
  updateMonitorById,
  getAllMonitors,
  deleteMonitors,
  resetMonitorStats,
  getMonitorsBySelect
} from '@/controllers/monitor';
import { validateRequestPayload } from '@/middlewares/validation';
import {
  createMonitorSchema,
  updateMonitorSchema
} from '@/validations/monitor';
import express from 'express';

const router = express.Router();

router.get('/', getAllMonitors);
router.get('/select', getMonitorsBySelect);
router.post(
  '/new',
  validateRequestPayload(createMonitorSchema),
  createNewMonitor
);
router.patch(
  '/:id',
  validateRequestPayload(updateMonitorSchema),
  updateMonitorById
);
router.get('/:id', getMonitorById);
router.delete('/', deleteMonitors);
router.get('/:id/incidents', getIncidentByMonitorId);
router.post('/reset-stats', resetMonitorStats);

export default router;
