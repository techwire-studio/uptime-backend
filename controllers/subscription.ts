import { catchAsync } from '@/middlewares/error';
import prisma from '@/prisma';
import {
  getRazorpayPayment,
  verifyPaymentSignature
} from '@/services/razorpay';
import {
  createSubscription as createSubscriptionService,
  changeSubscriptionPlan as changeSubscriptionPlanService,
  cancelSubscription as cancelSubscriptionService,
  syncSubscriptionFromRazorpay
} from '@/services/subscription';
import {
  sendSuccessResponse,
  sendErrorResponse
} from '@/utils/responseHandler';
import { RequestHandler } from 'express';
import logger from '@/utils/logger';
import { CreateSubscriptionType } from '@/types/subscription';
import { env } from '@/configs/env';
import { validateWebhookSignature } from 'razorpay/dist/utils/razorpay-utils';

/**
 * @route GET /subscriptions/plans
 * @description Get all available subscription plans
 */
export const getSubscriptionPlans: RequestHandler = catchAsync(
  async (_request, response) => {
    const plans = await prisma.subscription_plans.findMany({
      orderBy: [{ plan_type: 'asc' }, { billing_cycle: 'asc' }]
    });

    sendSuccessResponse({
      response,
      message: 'Subscription plans fetched successfully',
      data: plans
    });
  }
);

/**
 * @route GET /subscriptions/plans/:planId
 * @description Get subscription plan by ID
 */
export const getSubscriptionPlanById: RequestHandler = catchAsync(
  async (request, response) => {
    const { planId } = request.params;

    if (!planId) {
      return sendErrorResponse({
        response,
        statusCode: 404,
        message: 'Plan Id is required'
      });
    }

    const plan = await prisma.subscription_plans.findUnique({
      where: {
        razorpay_plan_id: planId
      }
    });

    if (!plan) {
      return sendErrorResponse({
        response,
        statusCode: 404,
        message: 'Subscription plan not found'
      });
    }

    sendSuccessResponse({
      response,
      message: 'Subscription plan fetched successfully',
      data: plan
    });
  }
);

/**
 * @route POST /workspaces/:workspaceId/subscriptions
 * @description Create or return subscription for a workspace (with add-ons)
 * Returns checkout data for frontend Razorpay integration.
 */
export const createSubscription: RequestHandler = catchAsync(
  async (request, response) => {
    const { workspaceId } = request.params;
    const payload = request.body as CreateSubscriptionType;

    if (!workspaceId) {
      return sendErrorResponse({
        response,
        message: 'Workspace ID is required',
        statusCode: 400
      });
    }

    try {
      const result = await createSubscriptionService({
        workspaceId,
        ...payload
      });

      sendSuccessResponse({
        response,
        message: result.subscription
          ? 'Subscription created successfully'
          : 'Subscription created in Razorpay. Database sync may be pending.',
        data: {
          subscription: result.subscription,
          checkout: {
            ...result.checkout,
            razorpayKeyId: env.RAZORPAY_KEY_ID
          }
        }
      });
    } catch (error: any) {
      logger.error('Error creating subscription:', error);
      return sendErrorResponse({
        response,
        message: error.message || 'Failed to create subscription',
        statusCode: 400
      });
    }
  }
);

/**
 * @route GET /workspaces/:workspaceId/subscription
 * @description Get current subscription status for a workspace
 */
export const getSubscriptionStatus: RequestHandler = catchAsync(
  async (request, response) => {
    const { workspaceId } = request.params;

    if (!workspaceId) {
      return sendErrorResponse({
        response,
        message: 'Workspace ID is required',
        statusCode: 400
      });
    }

    const workspace = await prisma.workspaces.findUnique({
      where: { id: workspaceId },
      include: {
        subscription: {
          include: {
            plan: true,
            transactions: {
              orderBy: { created_at: 'desc' },
              take: 10
            }
          }
        }
      }
    });

    if (!workspace) {
      return sendErrorResponse({
        response,
        message: 'Workspace not found',
        statusCode: 404
      });
    }

    // If subscription exists, sync with Razorpay
    if (workspace.subscription?.razorpay_subscription_id) {
      try {
        await syncSubscriptionFromRazorpay(
          workspace.subscription.razorpay_subscription_id
        );
      } catch (error) {
        logger.error('Error syncing subscription with Razorpay:', error);
      }
    }

    // Return workspace with subscription
    const updatedWorkspace = await prisma.workspaces.findUnique({
      where: { id: workspaceId },
      include: {
        subscription: {
          include: {
            plan: true,
            transactions: {
              orderBy: { created_at: 'desc' },
              take: 10
            }
          }
        }
      }
    });

    sendSuccessResponse({
      response,
      message: 'Subscription status fetched successfully',
      data: {
        workspace: {
          id: updatedWorkspace?.id,
          name: updatedWorkspace?.name,
          current_plan_type: updatedWorkspace?.current_plan_type
        },
        subscription: updatedWorkspace?.subscription || null
      }
    });
  }
);

/**
 * @route POST /subscriptions/verify
 * @description Verify a payment transaction
 */
export const verifyTransaction: RequestHandler = catchAsync(
  async (request, response) => {
    const { razorpay_payment_id, razorpay_signature, subscription_id } =
      request.body;

    // Verify payment signature
    const isValid = verifyPaymentSignature(
      razorpay_payment_id,
      subscription_id,
      razorpay_signature
    );

    if (!isValid) {
      return sendErrorResponse({
        response,
        message: 'Invalid payment signature',
        statusCode: 400
      });
    }

    // Fetch payment details from Razorpay
    const payment = await getRazorpayPayment(razorpay_payment_id);

    // Get subscription
    const subscription = await prisma.subscriptions.findUnique({
      where: { razorpay_subscription_id: subscription_id },
      include: { plan: true }
    });

    if (!subscription) {
      return sendErrorResponse({
        response,
        message: 'Subscription not found',
        statusCode: 404
      });
    }

    // Create or update transaction record
    const transaction = await prisma.subscription_transactions.upsert({
      where: { razorpay_payment_id: razorpay_payment_id },
      update: {
        status: payment.status === 'captured' ? 'success' : 'failed',
        payment_method: payment.method,
        failure_reason:
          payment.status !== 'captured' ? payment.error_description : null,
        metadata: payment as any,
        updated_at: new Date()
      },
      create: {
        subscription_id: subscription.id,
        razorpay_payment_id: razorpay_payment_id,
        razorpay_order_id: null,
        amount: Number(payment.amount) / 100, // Convert from paise to rupees
        currency: payment.currency.toUpperCase(),
        status: payment.status === 'captured' ? 'success' : 'failed',
        payment_method: payment.method,
        failure_reason:
          payment.status !== 'captured' ? payment.error_description : null,
        metadata: payment as any
      }
    });

    // Update subscription status if payment is successful
    if (payment.status === 'captured') {
      await prisma.$transaction(async (tx) => {
        await tx.subscriptions.update({
          where: { id: subscription.id },
          data: {
            status: 'active'
          }
        });

        // Update workspace plan type
        const plan = await tx.subscription_plans.findUnique({
          where: { id: subscription.plan_id }
        });
        if (plan) {
          await tx.workspaces.update({
            where: { id: subscription.workspace_id },
            data: { current_plan_type: plan.plan_type }
          });
        }
      });
    }

    sendSuccessResponse({
      response,
      message: 'Transaction verified successfully',
      data: {
        verified: true,
        transaction,
        payment
      }
    });
  }
);

/**
 * @route POST /subscriptions/:subscriptionId/cancel
 * @description Cancel a subscription
 */
export const cancelSubscription: RequestHandler = catchAsync(
  async (request, response) => {
    const { subscriptionId } = request.params;
    const cancelAtPeriodEnd = request.body?.cancelAtPeriodEnd || true;

    if (!subscriptionId) {
      return sendErrorResponse({
        response,
        message: 'Subscription ID is required',
        statusCode: 400
      });
    }

    try {
      const subscription = await cancelSubscriptionService(
        subscriptionId,
        cancelAtPeriodEnd
      );

      sendSuccessResponse({
        response,
        message: cancelAtPeriodEnd
          ? 'Subscription will be cancelled at the end of the billing cycle'
          : 'Subscription cancelled successfully',
        data: subscription
      });
    } catch (error: any) {
      logger.error('Error cancelling subscription:', error);
      return sendErrorResponse({
        response,
        message: error.message || 'Failed to cancel subscription',
        statusCode: 400
      });
    }
  }
);

/**
 * @route POST /workspaces/:workspaceId/subscriptions/upgrade
 * @description Upgrade or downgrade a subscription
 */
export const changeSubscriptionPlan: RequestHandler = catchAsync(
  async (request, response) => {
    const { workspaceId } = request.params;
    const { newPlanId, addons, cancelAtPeriodEnd = false } = request.body;

    if (!workspaceId) {
      return sendErrorResponse({
        response,
        message: 'Workspace ID is required',
        statusCode: 400
      });
    }

    if (!newPlanId) {
      return sendErrorResponse({
        response,
        message: 'New plan ID is required',
        statusCode: 400
      });
    }

    try {
      const result = await changeSubscriptionPlanService(
        workspaceId,
        newPlanId,
        addons,
        cancelAtPeriodEnd
      );

      sendSuccessResponse({
        response,
        message: 'Subscription plan changed successfully',
        data: {
          subscription: result.subscription,
          checkout: {
            ...result.checkout,
            razorpayKeyId: env.RAZORPAY_KEY_ID
          }
        }
      });
    } catch (error: any) {
      logger.error('Error changing subscription plan:', error);
      return sendErrorResponse({
        response,
        message: error.message || 'Failed to change subscription plan',
        statusCode: 400
      });
    }
  }
);

/**
 * @route POST /subscriptions/webhook
 * @description Handle Razorpay webhook events
 */
export const handleWebhook: RequestHandler = catchAsync(
  async (request, response) => {
    const signature = request.headers['x-razorpay-signature'] as string;

    if (!signature) {
      return sendErrorResponse({
        response,
        message: 'Missing webhook signature',
        statusCode: 400
      });
    }

    const isValid = validateWebhookSignature(
      JSON.stringify(request.body),
      signature,
      env.RAZORPAY_WEBHOOK_SECRET
    );

    if (!isValid) {
      return sendErrorResponse({
        response,
        message: 'Invalid webhook signature',
        statusCode: 401
      });
    }

    const body =
      typeof request.body === 'string'
        ? JSON.parse(request.body)
        : request.body;

    const event = body.event;
    const payload = body.payload;

    logger.info(`Received Razorpay webhook: ${event}`);

    try {
      switch (event) {
        case 'subscription.activated':
        case 'subscription.charged':
          await handleSubscriptionActivated(payload);
          break;

        case 'subscription.cancelled':
          await handleSubscriptionCancelled(payload);
          break;

        case 'subscription.paused':
          await handleSubscriptionPaused(payload);
          break;

        case 'subscription.resumed':
          await handleSubscriptionResumed(payload);
          break;

        case 'subscription.expired':
          await handleSubscriptionExpired(payload);
          break;

        case 'payment.captured':
          await handlePaymentCaptured(payload);
          break;

        case 'payment.failed':
          await handlePaymentFailed(payload);
          break;

        case 'invoice.paid':
          await handleInvoicePaid(payload);
          break;

        case 'invoice.payment_failed':
          await handleInvoicePaymentFailed(payload);
          break;

        default:
          logger.info(`Unhandled webhook event: ${event}`);
      }

      // Razorpay expects a 200 response
      response.status(200).json({ status: 'ok' });
    } catch (error: any) {
      logger.error('Error processing webhook:', {
        event,
        error: error.message,
        stack: error.stack
      });
      // Still return 200 to Razorpay to prevent retries for non-recoverable errors
      // Log the error for manual investigation
      response.status(200).json({
        status: 'error',
        message: 'Webhook processing failed but acknowledged'
      });
    }
  }
);

// Webhook handlers
async function handleSubscriptionActivated(payload: any) {
  const subscriptionId = payload.subscription.entity.id;

  try {
    await syncSubscriptionFromRazorpay(subscriptionId);
  } catch (error) {
    logger.error('Error syncing subscription on activation:', error);
  }
}

async function handleSubscriptionCancelled(payload: any) {
  const subscriptionId = payload.subscription.entity.id;

  const subscription = await prisma.subscriptions.findFirst({
    where: { razorpay_subscription_id: subscriptionId }
  });

  if (subscription && subscription.id) {
    await prisma.$transaction(async (tx) => {
      await tx.subscriptions.update({
        where: { id: subscription.id },
        data: {
          status: 'cancelled',
          cancelled_at: new Date(),
          is_current: false,
          updated_at: new Date()
        }
      });

      // Update workspace to free
      await tx.workspaces.update({
        where: { id: subscription.workspace_id },
        data: { current_plan_type: 'free' }
      });
    });
  }
}

async function handleSubscriptionPaused(payload: any) {
  const subscriptionId = payload.subscription.entity.id;

  const subscription = await prisma.subscriptions.findFirst({
    where: { razorpay_subscription_id: subscriptionId }
  });

  if (subscription && subscription.id) {
    await prisma.subscriptions.update({
      where: { id: subscription.id },
      data: {
        status: 'paused',
        updated_at: new Date()
      }
    });
  }
}

async function handleSubscriptionResumed(payload: any) {
  const subscriptionId = payload.subscription.entity.id;

  try {
    await syncSubscriptionFromRazorpay(subscriptionId);
  } catch (error) {
    logger.error('Error syncing subscription on resume:', error);
  }
}

async function handlePaymentCaptured(payload: any) {
  const payment = payload.payment.entity;
  const subscriptionId = payment.subscription_id;

  if (!subscriptionId) return;

  const subscription = await prisma.subscriptions.findFirst({
    where: { razorpay_subscription_id: subscriptionId },
    include: { plan: true }
  });

  if (subscription && subscription.id) {
    // Create/update transaction record
    await prisma.subscription_transactions.upsert({
      where: { razorpay_payment_id: payment.id },
      update: {
        status: 'success',
        payment_method: payment.method,
        metadata: payment as any,
        updated_at: new Date()
      },
      create: {
        subscription_id: subscription.id,
        razorpay_payment_id: payment.id,
        razorpay_order_id: payment.order_id,
        amount: Number(payment.amount) / 100,
        currency: payment.currency.toUpperCase(),
        status: 'success',
        payment_method: payment.method,
        metadata: payment as any
      }
    });

    // Sync subscription from Razorpay to get latest status and period dates
    // This ensures we have the correct active status and billing period
    try {
      await syncSubscriptionFromRazorpay(subscriptionId);
      logger.info(
        `Subscription ${subscriptionId} activated after payment capture`
      );
    } catch (error) {
      logger.error(
        `Error syncing subscription ${subscriptionId} after payment:`,
        error
      );
      // Fallback: manually update to active if sync fails
      await prisma.$transaction(async (tx) => {
        await tx.subscriptions.update({
          where: { id: subscription.id },
          data: {
            status: 'active',
            is_current: true,
            updated_at: new Date()
          }
        });

        // Update workspace plan type
        if (subscription.plan) {
          await tx.workspaces.update({
            where: { id: subscription.workspace_id },
            data: { current_plan_type: subscription.plan.plan_type }
          });
        }
      });
    }
  }
}

async function handlePaymentFailed(payload: any) {
  const payment = payload.payment.entity;
  const subscriptionId = payment.subscription_id;

  if (!subscriptionId) return;

  const subscription = await prisma.subscriptions.findFirst({
    where: { razorpay_subscription_id: subscriptionId }
  });

  if (subscription && subscription.id) {
    await prisma.subscription_transactions.upsert({
      where: { razorpay_payment_id: payment.id },
      update: {
        status: 'failed',
        payment_method: payment.method,
        failure_reason: payment.error_description || 'Payment failed',
        metadata: payment as any,
        updated_at: new Date()
      },
      create: {
        subscription_id: subscription.id,
        razorpay_payment_id: payment.id,
        razorpay_order_id: payment.order_id,
        amount: Number(payment.amount) / 100,
        currency: payment.currency.toUpperCase(),
        status: 'failed',
        payment_method: payment.method,
        failure_reason: payment.error_description || 'Payment failed',
        metadata: payment as any
      }
    });

    // Update subscription status if payment fails
    await prisma.subscriptions.update({
      where: { id: subscription.id },
      data: {
        status: 'past_due',
        updated_at: new Date()
      }
    });
  }
}

async function handleSubscriptionExpired(payload: any) {
  const subscriptionId = payload.subscription.entity.id;
  const razorpaySubscription = payload.subscription.entity;

  const subscription = await prisma.subscriptions.findFirst({
    where: { razorpay_subscription_id: subscriptionId }
  });

  if (subscription && subscription.id) {
    await prisma.$transaction(async (tx) => {
      await tx.subscriptions.update({
        where: { id: subscription.id },
        data: {
          status: razorpaySubscription.status || 'expired',
          is_current: false,
          updated_at: new Date()
        }
      });

      await tx.workspaces.update({
        where: { id: subscription.workspace_id },
        data: { current_plan_type: 'free' }
      });
    });
  }
}

async function handleInvoicePaid(payload: any) {
  const invoice = payload.invoice.entity;
  const subscriptionId = invoice.subscription_id;

  if (!subscriptionId) return;

  const subscription = await prisma.subscriptions.findFirst({
    where: { razorpay_subscription_id: subscriptionId },
    include: { plan: true }
  });

  if (subscription && subscription.id) {
    // Sync subscription from Razorpay to get latest status and period dates
    // Invoice paid means subscription should be active
    try {
      await syncSubscriptionFromRazorpay(subscriptionId);
      logger.info(
        `Subscription ${subscriptionId} activated after invoice payment`
      );
    } catch (error) {
      logger.error(
        `Error syncing subscription ${subscriptionId} after invoice payment:`,
        error
      );
      // Fallback: manually update to active if sync fails
      await prisma.$transaction(async (tx) => {
        await tx.subscriptions.update({
          where: { id: subscription.id },
          data: {
            status: 'active',
            is_current: true,
            updated_at: new Date()
          }
        });

        // Update workspace plan type
        if (subscription.plan) {
          await tx.workspaces.update({
            where: { id: subscription.workspace_id },
            data: { current_plan_type: subscription.plan.plan_type }
          });
        }
      });
    }
  }
}

async function handleInvoicePaymentFailed(payload: any) {
  const invoice = payload.invoice.entity;
  const subscriptionId = invoice.subscription_id;

  if (!subscriptionId) return;

  const subscription = await prisma.subscriptions.findFirst({
    where: { razorpay_subscription_id: subscriptionId }
  });

  if (subscription && subscription.id) {
    // Update subscription to past_due if invoice payment fails
    await prisma.subscriptions.update({
      where: { id: subscription.id },
      data: {
        status: 'past_due',
        updated_at: new Date()
      }
    });
  }
}

/**
 * @route GET /workspaces/:workspaceId/invoices
 * @description Get subscription invoices / transactions for a workspace
 */
export const getWorkspaceSubscriptionInvoices: RequestHandler = catchAsync(
  async (request, response) => {
    const { workspaceId } = request.params;

    if (!workspaceId) {
      return sendErrorResponse({
        response,
        statusCode: 400,
        message: 'Workspace ID is required'
      });
    }

    const workspace = await prisma.workspaces.findUnique({
      where: { id: workspaceId }
    });

    if (!workspace) {
      return sendErrorResponse({
        response,
        statusCode: 404,
        message: 'Workspace not found'
      });
    }

    const subscription = await prisma.subscriptions.findUnique({
      where: { workspace_id: workspaceId },
      include: {
        plan: { select: { name: true } },
        transactions: {
          orderBy: { created_at: 'desc' }
        }
      }
    });

    if (!subscription) {
      return sendSuccessResponse({
        response,
        message: 'No subscription found for workspace',
        data: {
          subscription: null,
          invoices: []
        }
      });
    }

    const invoices = subscription.transactions.map((txn) => {
      const metadata = txn.metadata as unknown as Record<string, string>;

      return {
        id: metadata?.invoice_id,
        name: `${metadata?.description} — ${subscription.plan.name}`,
        date: txn.created_at,
        amount: {
          value: txn.amount,
          currency: txn.currency
        },
        status: txn.status
      };
    });

    sendSuccessResponse({
      response,
      message: 'Subscription invoices fetched successfully',
      data: invoices
    });
  }
);
