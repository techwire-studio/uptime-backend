import { updateUserMetadata, getUserMetadata } from '@/controllers/user';
import { authenticationMiddleware } from '@/middlewares/auth';
import express from 'express';

const router = express.Router();

router
  .route('/:id')
  .get(authenticationMiddleware, getUserMetadata)
  .patch(authenticationMiddleware, updateUserMetadata);

export default router;
