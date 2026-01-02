import {
  createIncidentComment,
  deleteIncidentComment,
  getIncidentComments,
  updateIncidentComment
} from '@/controllers/activity';
import { getIncidentById } from '@/controllers/incident';
import { authenticationMiddleware } from '@/middlewares/auth';
import { validateRequestPayload } from '@/middlewares/validation';
import {
  createCommentSchema,
  updateCommentSchema
} from '@/validations/activity';
import { Router } from 'express';

const router = Router();

router.get('/:id', authenticationMiddleware, getIncidentById);

router.get(
  '/:incidentId/comments',
  authenticationMiddleware,
  getIncidentComments
);

router.post(
  '/:incidentId/comments',
  authenticationMiddleware,
  validateRequestPayload(createCommentSchema),
  createIncidentComment
);

router.patch(
  '/comments/:id',
  authenticationMiddleware,
  validateRequestPayload(updateCommentSchema),
  updateIncidentComment
);

router.delete('/comments/:id', authenticationMiddleware, deleteIncidentComment);

export default router;
