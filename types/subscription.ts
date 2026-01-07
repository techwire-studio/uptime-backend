import { createSubscriptionSchema } from '@/validations/subscription';
import z from 'zod';

export type CreateSubscriptionParams = CreateSubscriptionType & {
  workspaceId: string;
};

export type CustomerContactDetails = {
  city: string;
  country: string;
  zipCode: string;
  streetAddress: string;
};

export interface BillingSnapshot {
  basePrice: number;
  addons: AddonsType[];
  totalAmount: number;
  currency: string;
}

export type CreateSubscriptionType = z.infer<typeof createSubscriptionSchema>;

export type AddonsType = {
  name: string;
  quantity: number;
  price_per_unit?: number;
  max_quantity?: number;
};
