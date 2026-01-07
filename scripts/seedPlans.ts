import { plans } from '@/constants';
import prisma from '@/prisma';
import { razorpay } from '@/services/razorpay';
import logger from '@/utils/logger';

async function getOrCreateRazorpayPlan(params: {
  name: string;
  cycle: 'monthly' | 'yearly';
  amount: number;
  planType: string;
}) {
  const { name, cycle, amount, planType } = params;

  const allPlans = await razorpay.plans.all({ count: 100 });

  const existingPlan = allPlans.items.find((p) => p.item?.name === name);

  if (existingPlan) {
    return existingPlan.id;
  }

  const createdPlan = await razorpay.plans.create({
    period: cycle,
    interval: cycle === 'monthly' ? 1 : 12,
    item: {
      name,
      amount: amount * 100,
      currency: 'INR',
      description: `${planType} plan billed ${cycle}`
    }
  });

  return createdPlan.id;
}

async function seedPlans() {
  for (const plan of plans) {
    for (const cycle of ['monthly', 'yearly'] as const) {
      const amount =
        cycle === 'monthly' ? plan.monthly_price : plan.annual_price;

      const existing = await prisma.subscription_plans.findUnique({
        where: {
          plan_type_billing_cycle: {
            plan_type: plan.plan_type,
            billing_cycle: cycle
          }
        }
      });

      if (existing) continue;

      let razorpayPlanId: string | null = null;

      if (amount > 0) {
        const planName = `${plan.name} (${cycle})`;

        razorpayPlanId = await getOrCreateRazorpayPlan({
          name: planName,
          cycle,
          amount,
          planType: plan.plan_type
        });
      }

      await prisma.subscription_plans.create({
        data: {
          name: plan.name,
          plan_type: plan.plan_type,
          billing_cycle: cycle,
          addons: plan.addons,
          amount,
          currency: 'INR',
          interval_count: cycle === 'monthly' ? 1 : 12,
          features: plan.features,
          razorpay_plan_id: razorpayPlanId
        }
      });
    }
  }

  logger.info('✅ Monthly & Annual plans created');
  await prisma.$disconnect();
}

seedPlans().catch((e) => {
  logger.error('❌ Seeding failed', e);
  prisma.$disconnect();
});
