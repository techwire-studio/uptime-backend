import { plans } from '@/constants';
import prisma from '@/prisma';
import logger from '@/utils/logger';

async function updatePlans() {
  for (const plan of plans) {
    for (const cycle of ['monthly', 'yearly'] as const) {
      const price =
        cycle === 'monthly' ? plan.monthly_price : plan.annual_price;

      const intervalCount = cycle === 'monthly' ? 1 : 12;

      const existing = await prisma.subscription_plans.findUnique({
        where: {
          plan_type_billing_cycle: {
            plan_type: plan.plan_type,
            billing_cycle: cycle
          }
        }
      });

      if (!existing) {
        logger.warn(
          `⚠️ Plan not found: ${plan.plan_type} (${cycle}), skipping`
        );
        continue;
      }

      await prisma.subscription_plans.update({
        where: { id: existing.id },
        data: {
          name: plan.name,
          price,
          features: plan.features,
          max_monitors: plan.features.max_monitors,
          monitoring_interval_seconds:
            plan.features.monitoring_interval_seconds,
          interval_count: intervalCount
        }
      });

      logger.info(`✅ Updated ${plan.plan_type} (${cycle})`);
    }
  }

  logger.info('🎉 Subscription plans updated successfully');
  await prisma.$disconnect();
}

updatePlans().catch((e) => {
  logger.error('❌ Update failed', e);
  prisma.$disconnect();
});
