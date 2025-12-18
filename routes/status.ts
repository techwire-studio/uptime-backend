import {
  createStatusPage,
  deleteStatusPage,
  getStatusPageById,
  updateStatusPage
} from '@/controllers/status';
import { authenticationMiddleware } from '@/middlewares/auth';
import { validateRequestPayload } from '@/middlewares/validation';
import {
  createStatusPageSchema,
  updateStatusPageSchema
} from '@/validations/status';
import express from 'express';

const router = express.Router();

router
  .route('/')
  .post(
    authenticationMiddleware,
    validateRequestPayload(createStatusPageSchema),
    createStatusPage
  );

router
  .route('/:id')
  .get(getStatusPageById)
  .patch(
    authenticationMiddleware,
    validateRequestPayload(updateStatusPageSchema),
    updateStatusPage
  )
  .delete(authenticationMiddleware, deleteStatusPage);

export default router;
