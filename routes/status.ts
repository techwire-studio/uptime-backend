import {
  createStatusPage,
  deleteStatusPage,
  getStatusPageById,
  getStatusPagesByWorkspace,
  updateStatusPage
} from '@/controllers/status';
import { validateRequestPayload } from '@/middlewares/validation';
import {
  createStatusPageSchema,
  updateStatusPageSchema
} from '@/validations/status';
import express from 'express';

const router = express.Router();

router.post(
  '/',
  validateRequestPayload(createStatusPageSchema),
  createStatusPage
);
router.get('/workspace/:workspace_id', getStatusPagesByWorkspace);
router.get('/:id', getStatusPageById);
router.patch(
  '/:id',
  validateRequestPayload(updateStatusPageSchema),
  updateStatusPage
);
router.delete('/:id', deleteStatusPage);

export default router;
