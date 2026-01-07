import express from 'express';
import {
  getSubscriptionPlans,
  verifyTransaction,
  getSubscriptionPlanById,
  handleWebhook,
  cancelSubscription
} from '@/controllers/subscription';
import { authenticationMiddleware } from '@/middlewares/auth';
import { validateRequestPayload } from '@/middlewares/validation';
import { verifyTransactionSchema } from '@/validations/subscription';

const router = express.Router();

router.get('/plans', authenticationMiddleware, getSubscriptionPlans);
router.post('/webhook', handleWebhook);
router.get('/plans/:planId', authenticationMiddleware, getSubscriptionPlanById);
router.post(
  '/verify',
  authenticationMiddleware,
  validateRequestPayload(verifyTransactionSchema),
  verifyTransaction
);
router.post(
  '/:subscriptionId/cancel',
  authenticationMiddleware,
  cancelSubscription
);

export default router;
