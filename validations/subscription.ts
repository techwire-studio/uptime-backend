import { z } from 'zod';

export const createSubscriptionSchema = z.object({
  planId: z.string().uuid('Invalid plan ID'),
  customerEmail: z.string().email('Invalid email address'),
  customerName: z.string(),
  customerContact: z.object({
    city: z.string().min(1, 'City is required'),
    country: z.string().min(1, 'Country is required'),
    zipCode: z.string().min(1, 'Zip code is required'),
    streetAddress: z.string().min(1, 'Street address is required')
  }),
  addons: z
    .array(
      z.object({
        name: z.string().min(1, 'Invalid addon name'),
        quantity: z.number().int().positive('Quantity must be positive')
      })
    )
    .optional()
});

export const verifyTransactionSchema = z.object({
  razorpay_payment_id: z.string().min(1, 'Payment ID is required'),
  razorpay_signature: z.string().min(1, 'Signature is required'),
  subscription_id: z.string().min(1, 'Subscription Id is required')
});

export const changeSubscriptionPlanSchema = z.object({
  body: z.object({
    newPlanId: z.string().uuid('Invalid plan ID'),
    addons: z
      .array(
        z.object({
          addon_id: z.string().uuid('Invalid addon ID'),
          quantity: z
            .number()
            .int()
            .positive('Quantity must be positive')
            .optional()
        })
      )
      .optional(),
    cancelAtPeriodEnd: z.boolean().optional().default(false)
  })
});
