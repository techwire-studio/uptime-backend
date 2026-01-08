import prisma from '@/prisma';
import {
  getOrCreateRazorpayCustomer,
  createRazorpaySubscriptionWithAddons,
  cancelRazorpaySubscription,
  razorpay
} from '@/services/razorpay';
import {
  AddonsType,
  BillingSnapshot,
  CreateSubscriptionParams,
  CustomerContactDetails
} from '@/types/subscription';
import logger from '@/utils/logger';

export async function calculateBillingSnapshot(
  planId: string,
  addons?: AddonsType[]
): Promise<BillingSnapshot> {
  const plan = await prisma.subscription_plans.findUnique({
    where: { id: planId }
  });

  if (!plan) {
    throw new Error('Plan not found');
  }

  const basePrice = Number(plan.amount);
  const currency = plan.currency || 'INR';

  const addonSnapshots: BillingSnapshot['addons'] = [];

  const addonDefs = (plan.addons || []) as unknown as AddonsType[];

  if (addons && addons.length > 0) {
    for (const addon of addons) {
      const addonDef = addonDefs.find((a) => a.name === addon.name);
      if (!addonDef) {
        throw new Error(`Add-on ${addon.name} not found`);
      }

      addonSnapshots.push({
        name: addonDef.name,
        price_per_unit: addonDef.price_per_unit || 1,
        quantity: addon.quantity || 1
      });
    }
  }

  const addonsTotal = addonSnapshots.reduce(
    (sum, addon) => sum + Number(addon.price_per_unit) * addon.quantity,
    0
  );
  const totalAmount = Number(basePrice) + addonsTotal;

  return {
    basePrice,
    addons: addonSnapshots,
    totalAmount,
    currency
  };
}

/**
 * Ensure Razorpay customer exists for workspace
 * Reuses existing customer if found, creates new one if not
 */
export async function ensureRazorpayCustomer(
  workspaceId: string,
  customerEmail: string,
  customerName?: string
): Promise<string> {
  const workspace = await prisma.workspaces.findUnique({
    where: { id: workspaceId }
  });

  if (workspace?.razorpay_customer_id) {
    try {
      await razorpay.customers.fetch(workspace.razorpay_customer_id);
      logger.info(
        `Reusing existing Razorpay customer: ${workspace.razorpay_customer_id}`
      );
      return workspace.razorpay_customer_id;
    } catch (error) {
      logger.warn(
        `Customer ${workspace.razorpay_customer_id} not found in Razorpay, creating new one`
      );
    }
  }

  const customer = await getOrCreateRazorpayCustomer({
    name: customerName || workspace?.name || 'Customer',
    email: customerEmail,
    notes: {
      workspace_id: workspaceId,
      workspace_name: workspace?.name || 'Unknown'
    }
  });

  await prisma.workspaces.update({
    where: { id: workspaceId },
    data: { razorpay_customer_id: customer.id }
  });

  return customer.id;
}

/**
 * Check for existing active subscription (idempotency check)
 * Returns subscriptions in created, authenticated, or active status
 */
export async function findExistingActiveSubscription(workspaceId: string) {
  return await prisma.subscriptions.findFirst({
    where: {
      workspace_id: workspaceId,
      is_current: true,
      status: {
        in: ['created', 'authenticated', 'active']
      }
    },
    include: { plan: true },
    orderBy: {
      created_at: 'desc'
    }
  });
}

/**
 * Compare if subscription matches requested plan and addons
 */
function doesSubscriptionMatch(
  subscription: {
    plan_id: string;
    addons?: AddonsType[];
  },
  requestedPlanId: string,
  requestedAddons?: AddonsType[]
): boolean {
  if (subscription.plan_id !== requestedPlanId) return false;

  const requestedAddonNames = Array.isArray(requestedAddons)
    ? requestedAddons
        .map((a) => a?.name)
        .filter(Boolean)
        .sort()
    : [];

  const existingAddonNames = Array.isArray(subscription?.addons)
    ? subscription.addons
        .map((a) => a?.name)
        .filter(Boolean)
        .sort()
    : [];

  const addonNamesMatch =
    requestedAddonNames.length === existingAddonNames.length &&
    requestedAddonNames.every((name, idx) => name === existingAddonNames[idx]);

  if (!addonNamesMatch) return false;

  if (requestedAddons) {
    for (const requestedAddon of requestedAddons) {
      const existingAddon = subscription?.addons?.find(
        (a) => a.name === requestedAddon.name
      );
      if (
        !existingAddon ||
        (existingAddon.quantity || 1) !== (requestedAddon.quantity || 1)
      ) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Create subscription with full failure recovery
 */
export async function createSubscription(params: CreateSubscriptionParams) {
  const {
    workspaceId,
    planId,
    customerEmail,
    customerName,
    customerContact,
    addons
  } = params;

  const [workspace, plan] = await Promise.all([
    prisma.workspaces.findUnique({
      where: { id: workspaceId },
      include: { owner: true }
    }),
    prisma.subscription_plans.findUnique({
      where: { id: planId }
    })
  ]);

  if (!workspace) {
    throw new Error('Workspace not found');
  }

  if (!plan || !plan.razorpay_plan_id) {
    throw new Error('Invalid or unconfigured subscription plan');
  }

  await prisma.workspaces.update({
    where: { id: workspaceId },
    data: {
      billing_details: customerContact
    }
  });

  const existingSubscription =
    await findExistingActiveSubscription(workspaceId);

  if (existingSubscription) {
    const matches = doesSubscriptionMatch(existingSubscription, planId, addons);

    if (matches && existingSubscription.razorpay_subscription_id) {
      const razorpaySub = await razorpay.subscriptions.fetch(
        existingSubscription.razorpay_subscription_id
      );

      let totalAmount = 0;
      if (existingSubscription.base_price_snapshot) {
        totalAmount += Number(existingSubscription.base_price_snapshot);
      }
      if (existingSubscription.addons_snapshot) {
        const addonsSnapshot = existingSubscription.addons_snapshot as Array<{
          price_per_unit: number;
          quantity: number;
        }>;
        for (const addon of addonsSnapshot) {
          totalAmount += Number(addon.price_per_unit) * addon.quantity;
        }
      }

      const currentPeriodStart = razorpaySub.current_start
        ? new Date(razorpaySub.current_start * 1000)
        : existingSubscription.current_period_start;

      const currentPeriodEnd = razorpaySub.current_end
        ? new Date(razorpaySub.current_end * 1000)
        : existingSubscription.current_period_end;

      const updated = await prisma.subscriptions.update({
        where: { id: existingSubscription.id },
        data: {
          status: razorpaySub.status,
          current_period_start: currentPeriodStart,
          current_period_end: currentPeriodEnd,
          is_current: true
        }
      });

      return {
        subscription: updated,
        checkout: {
          razorpaySubscriptionId: updated.razorpay_subscription_id || '',
          razorpayCustomerId: updated.razorpay_customer_id || '',
          subscriptionId: updated.id,
          amount: String(Math.round(Number(totalAmount) * 100)),
          currency: updated.currency_snapshot || 'INR'
        }
      };
    }
  }

  const planAddons = (plan.addons || []) as unknown as AddonsType[];

  if (addons && addons.length > 0) {
    const addonNames = addons?.map((a) => a.name);
    const validAddons = planAddons.filter((a) => addonNames.includes(a.name));

    if (validAddons.length !== addons.length) {
      throw new Error('One or more add-ons are invalid for this plan');
    }

    for (const addon of addons) {
      const addonDef = planAddons.find((a) => a.name === addon.name);
      if (addonDef && addonDef.max_quantity) {
        if (!addon.quantity || addon.quantity > addonDef.max_quantity) {
          throw new Error(
            `Add-on ${addonDef.name} quantity exceeds maximum (${addonDef.max_quantity})`
          );
        }
      }
    }
  }

  const billingSnapshot = await calculateBillingSnapshot(planId, addons);

  const razorpayCustomerId = await ensureRazorpayCustomer(
    workspaceId,
    customerEmail,
    customerName
  );

  let razorpaySubscriptionId: string | null = null;
  let razorpaySubscription: any = null;

  if (!razorpaySubscription) {
    try {
      const razorpayAddons =
        addons && addons.length > 0
          ? addons?.map((addon) => {
              const addonDef = planAddons.find((a) => a.name === addon.name);
              if (!addonDef) {
                throw new Error(`Add-on ${addon.name} not found`);
              }

              return {
                item: {
                  name: addonDef.name,
                  amount: Math.round(Number(addonDef.price_per_unit) * 100),
                  currency: plan.currency || 'INR',
                  description: `${addonDef.name} add-on`
                },
                quantity: addon.quantity || 1
              };
            })
          : undefined;

      const subscriptionParams = {
        plan_id: plan.razorpay_plan_id,
        customer_id: razorpayCustomerId,
        quantity: 1,
        customer_notify: false,
        notes: {
          workspace_id: workspaceId,
          plan_type: plan.plan_type,
          plan_id: planId
        },
        ...(Array.isArray(razorpayAddons) &&
          razorpayAddons.length > 0 && {
            addons: razorpayAddons
          })
      };

      razorpaySubscription =
        await createRazorpaySubscriptionWithAddons(subscriptionParams);

      razorpaySubscriptionId = razorpaySubscription.id;
      logger.info(`Created Razorpay subscription: ${razorpaySubscriptionId}`);
    } catch (error: any) {
      logger.error('Failed to create Razorpay subscription:', error);
      throw new Error(`Failed to create subscription: ${error.message}`);
    }
  }

  let subscription;
  try {
    subscription = await prisma.$transaction(async (tx) => {
      const existing = await tx.subscriptions.findFirst({
        where: {
          workspace_id: workspaceId,
          is_current: true,
          status: {
            in: ['created', 'authenticated', 'active']
          }
        },
        include: {
          plan: true
        }
      });

      if (existing) {
        if (doesSubscriptionMatch(existing, planId, addons)) {
          logger.info(
            `Another request created matching subscription, returning it`
          );
          return existing;
        } else {
          logger.warn(
            `Another request created non-matching subscription, cancelling it`
          );
          if (
            existing.razorpay_subscription_id &&
            ['created', 'authenticated'].includes(existing.status)
          ) {
            try {
              await cancelRazorpaySubscription(
                existing.razorpay_subscription_id,
                false
              );
            } catch (error) {
              logger.warn(
                `Failed to cancel conflicting subscription: ${error}`
              );
            }
          }
          await tx.subscriptions.update({
            where: { id: existing.id },
            data: {
              status: 'cancelled',
              is_current: false,
              cancelled_at: new Date()
            }
          });
        }
      }

      const currentPeriodStart = razorpaySubscription?.current_start
        ? new Date(razorpaySubscription.current_start * 1000)
        : new Date();

      const currentPeriodEnd = razorpaySubscription?.current_end
        ? new Date(razorpaySubscription.current_end * 1000)
        : new Date(
            plan.billing_cycle === 'monthly'
              ? currentPeriodStart.getTime() + 30 * 24 * 60 * 60 * 1000
              : currentPeriodStart.getTime() + 365 * 24 * 60 * 60 * 1000
          );

      return await tx.subscriptions.upsert({
        where: { workspace_id: workspaceId },
        update: {
          plan_id: planId,
          razorpay_subscription_id: razorpaySubscriptionId as string,
          razorpay_customer_id: razorpayCustomerId,
          status: razorpaySubscription.status || 'created',
          is_current: true,
          current_period_start: currentPeriodStart,
          current_period_end: currentPeriodEnd,
          base_price_snapshot: billingSnapshot.basePrice,
          currency_snapshot: billingSnapshot.currency,
          addons_snapshot: billingSnapshot.addons,
          cancel_at_period_end: false,
          cancelled_at: null,
          ...(addons && addons.length > 0 ? addons : {})
        },
        create: {
          workspace_id: workspaceId,
          plan_id: planId,
          razorpay_subscription_id: razorpaySubscriptionId as string,
          razorpay_customer_id: razorpayCustomerId,
          status: razorpaySubscription.status || 'created',
          is_current: true,
          current_period_start: currentPeriodStart,
          current_period_end: currentPeriodEnd,
          base_price_snapshot: billingSnapshot.basePrice,
          currency_snapshot: billingSnapshot.currency,
          addons_snapshot: billingSnapshot.addons as any,
          ...(addons && addons.length > 0 ? addons : {})
        }
      });
    });
  } catch (error: any) {
    logger.error('Failed to save subscription to database:', error);
    return {
      subscription: null,
      checkout: {
        razorpaySubscriptionId: razorpaySubscriptionId || '',
        razorpayCustomerId: razorpayCustomerId,
        subscriptionId: '',
        amount: String(Math.round(Number(billingSnapshot.totalAmount) * 100)),
        currency: billingSnapshot.currency
      }
    };
  }

  return {
    subscription,
    checkout: {
      razorpaySubscriptionId: razorpaySubscriptionId || '',
      razorpayCustomerId: razorpayCustomerId,
      subscriptionId: subscription.id,
      amount: String(Math.round(Number(billingSnapshot.totalAmount) * 100)),
      currency: billingSnapshot.currency
    }
  };
}

/**
 * Upgrade or downgrade subscription
 */
export async function changeSubscriptionPlan(
  workspaceId: string,
  newPlanId: string,
  addons?: AddonsType[],
  cancelAtPeriodEnd: boolean = false
) {
  const currentSubscription = await prisma.subscriptions.findFirst({
    where: {
      workspace_id: workspaceId,
      is_current: true,
      status: {
        in: ['active', 'completed']
      }
    },
    include: { plan: true }
  });

  if (!currentSubscription) {
    throw new Error('No active subscription found');
  }

  if (currentSubscription.razorpay_subscription_id) {
    if (cancelAtPeriodEnd) {
      await cancelRazorpaySubscription(
        currentSubscription.razorpay_subscription_id,
        true
      );
      await prisma.subscriptions.update({
        where: { id: currentSubscription.id },
        data: {
          cancel_at_period_end: true,
          is_current: false
        }
      });
    } else {
      await cancelRazorpaySubscription(
        currentSubscription.razorpay_subscription_id,
        false
      );
      await prisma.subscriptions.update({
        where: { id: currentSubscription.id },
        data: {
          status: 'cancelled',
          is_current: false,
          cancelled_at: new Date()
        }
      });

      await prisma.workspaces.update({
        where: { id: workspaceId },
        data: { current_plan_type: 'free' }
      });
    }
  }

  const workspace = await prisma.workspaces.findUnique({
    where: { id: workspaceId },
    include: { owner: true }
  });

  if (!workspace) throw new Error('Workspace not found');

  return await createSubscription({
    workspaceId,
    planId: newPlanId,
    customerContact:
      workspace.billing_details as unknown as CustomerContactDetails,
    customerEmail: workspace.owner.email,
    customerName: workspace.owner.name ?? 'Owner',
    ...(addons && { addons })
  });
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd = false
) {
  const subscription = await prisma.subscriptions.findUnique({
    where: { id: subscriptionId },
    include: { workspace: true }
  });

  if (!subscription) {
    throw new Error('Subscription not found');
  }

  if (!subscription.razorpay_subscription_id) {
    throw new Error('Subscription is not linked to Razorpay');
  }

  if (cancelAtPeriodEnd) {
    await cancelRazorpaySubscription(
      subscription.razorpay_subscription_id,
      true
    );

    await prisma.subscriptions.update({
      where: { id: subscriptionId },
      data: {
        cancel_at_period_end: true
      }
    });
  } else {
    await cancelRazorpaySubscription(
      subscription.razorpay_subscription_id,
      false
    );

    await prisma.$transaction(async (tx) => {
      await tx.subscriptions.update({
        where: { id: subscriptionId },
        data: {
          status: 'cancelled',
          is_current: false,
          cancelled_at: new Date()
        }
      });

      await tx.workspaces.update({
        where: { id: subscription.workspace_id },
        data: { current_plan_type: 'free' }
      });
    });
  }

  return await prisma.subscriptions.findUnique({
    where: { id: subscriptionId }
  });
}

/**
 * Sync subscription status from Razorpay (failure recovery)
 */
export async function syncSubscriptionFromRazorpay(
  razorpaySubscriptionId: string
) {
  try {
    const razorpaySub = await razorpay.subscriptions.fetch(
      razorpaySubscriptionId
    );

    const subscription = await prisma.subscriptions.findFirst({
      where: { razorpay_subscription_id: razorpaySubscriptionId }
    });

    if (!subscription) {
      const workspaceId = razorpaySub.notes?.workspace_id;
      if (!workspaceId) {
        throw new Error(
          'Workspace ID not found in Razorpay subscription notes'
        );
      }

      const plan = await prisma.subscription_plans.findFirst({
        where: { razorpay_plan_id: razorpaySub.plan_id }
      });

      if (!plan) {
        throw new Error('Plan not found for Razorpay subscription');
      }

      return await prisma.subscriptions.create({
        data: {
          workspace_id: workspaceId as string,
          plan_id: plan.id,
          base_price_snapshot: plan.amount,
          razorpay_subscription_id: razorpaySubscriptionId,
          razorpay_customer_id: razorpaySub.customer_id as string,
          status: razorpaySub.status,
          is_current: true,
          current_period_start: new Date(
            (razorpaySub.current_start || Date.now() / 1000) * 1000
          ),
          current_period_end: new Date(
            (razorpaySub.current_end || Date.now() / 1000 + 2592000) * 1000
          ),
          cancel_at_period_end: razorpaySub.end_at !== null
        }
      });
    }

    if (razorpaySub.status === 'active' && subscription.workspace_id) {
      const plan = await prisma.subscription_plans.findUnique({
        where: { id: subscription.plan_id }
      });

      if (plan) {
        await prisma.workspaces.update({
          where: { id: subscription.workspace_id },
          data: { current_plan_type: plan.plan_type }
        });
      }
    }

    return await prisma.subscriptions.update({
      where: { id: subscription.id },
      data: {
        status: razorpaySub.status,
        is_current:
          razorpaySub.status === 'active' ||
          razorpaySub.status === 'authenticated' ||
          razorpaySub.status === 'created',
        ...(razorpaySub.current_start && {
          current_period_start: new Date(razorpaySub.current_start * 1000)
        }),
        ...(razorpaySub.current_end && {
          current_period_end: new Date(razorpaySub.current_end * 1000)
        }),
        cancel_at_period_end: razorpaySub.end_at !== null,
        cancelled_at: razorpaySub.end_at
          ? new Date(razorpaySub.end_at * 1000)
          : null
      }
    });
  } catch (error: any) {
    logger.error('Error syncing subscription from Razorpay:', error);
    throw error;
  }
}
