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
import multer from 'multer';

const router = express.Router();

const upload = multer({ dest: 'uploads/' });

router.route('/').post(
  authenticationMiddleware,
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'favicon', maxCount: 1 }
  ]),
  validateRequestPayload(createStatusPageSchema),
  createStatusPage
);

router
  .route('/:id')
  .get(getStatusPageById)
  .patch(
    authenticationMiddleware,
    upload.fields([
      { name: 'logo', maxCount: 1 },
      { name: 'favicon', maxCount: 1 }
    ]),
    validateRequestPayload(updateStatusPageSchema),
    updateStatusPage
  )
  .delete(authenticationMiddleware, deleteStatusPage);

export default router;
