import Razorpay from 'razorpay';
import crypto from 'crypto';
import { env } from '@/configs/env';
import logger from '@/utils/logger';

export const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET
});

export const cancelRazorpaySubscription = async (
  subscriptionId: string,
  cancelAtCycleEnd = false
) => {
  try {
    return razorpay.subscriptions.cancel(subscriptionId, cancelAtCycleEnd);
  } catch (error: any) {
    logger.error('Error cancelling Razorpay subscription', {
      subscriptionId,
      error: error?.message
    });

    throw new Error(
      `Failed to cancel Razorpay subscription: ${error?.message}`
    );
  }
};

export const verifyPaymentSignature = (
  razorpay_payment_id: string,
  razorpay_subscription_id: string,
  razorpay_signature: string
) => {
  try {
    const body = `${razorpay_payment_id}|${razorpay_subscription_id}`;

    const expectedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    return expectedSignature === razorpay_signature;
  } catch (error) {
    logger.error('Error verifying payment signature:', error);
    return false;
  }
};

/**
 * Fetch payment details from Razorpay
 */
export const getRazorpayPayment = async (paymentId: string) => {
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (error: any) {
    logger.error('Error fetching Razorpay payment:', error);
    throw new Error(`Failed to fetch Razorpay payment: ${error.message}`);
  }
};

/**
 * Search for a Razorpay customer by email
 * Returns the first matching customer or null
 */
export const findRazorpayCustomerByEmail = async (
  email: string
): Promise<any | null> => {
  try {
    const customers = await razorpay.customers.all({
      count: 100
    });

    const customer = customers.items?.find((c) => c.email === email);
    return customer || null;
  } catch (error: any) {
    logger.error('Error searching for Razorpay customer:', error);
    return null;
  }
};

/**
 * Get or create a Razorpay customer
 * Searches by email first, creates if not found
 */
export const getOrCreateRazorpayCustomer = async (params: {
  name: string;
  email: string;
  notes?: Record<string, string> | undefined;
}) => {
  try {
    const existingCustomer = await findRazorpayCustomerByEmail(params.email);

    if (existingCustomer) {
      logger.info(`Found existing Razorpay customer: ${existingCustomer.id}`);
      return existingCustomer;
    }

    const createParams: {
      name: string;
      email: string;
      notes?: Record<string, string>;
    } = {
      name: params.name,
      email: params.email
    };

    if (params.notes) createParams.notes = params.notes;

    const customer = await razorpay.customers.create(createParams);
    logger.info(`Created new Razorpay customer: ${customer.id}`);
    return customer;
  } catch (error: any) {
    logger.error('Error getting/creating Razorpay customer:', error);
    throw new Error(
      `Failed to get or create Razorpay customer: ${error.message}`
    );
  }
};

/**
 * Create a Razorpay subscription with add-ons support
 */
export const createRazorpaySubscriptionWithAddons = async (params: {
  plan_id: string;
  customer_id?: string;
  quantity?: number;
  addons?: Array<{
    item: {
      name: string;
      amount: number;
      currency: string;
      description?: string;
    };
    quantity?: number;
  }>;
  notes?: Record<string, string>;
  customer_notify?: boolean;
}) => {
  try {
    const subscriptionParams: any = {
      plan_id: params.plan_id,
      total_count: 12,
      quantity: params.quantity || 1,
      customer_notify: params.customer_notify ?? false,
      notes: params.notes || {}
    };

    // Add customer_id if provided
    if (params.customer_id) {
      subscriptionParams.customer_id = params.customer_id;
    }

    // Add add-ons if provided
    if (params.addons && params.addons.length > 0) {
      subscriptionParams.addons = params.addons;
    }

    const subscription =
      await razorpay.subscriptions.create(subscriptionParams);
    logger.info(`Created Razorpay subscription: ${subscription.id}`);
    return subscription;
  } catch (error: any) {
    logger.error('Error creating Razorpay subscription:', error);
    throw new Error(`Failed to create Razorpay subscription: ${error.message}`);
  }
};
