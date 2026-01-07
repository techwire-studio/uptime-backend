/*
  Warnings:

  - You are about to drop the column `max_monitors` on the `subscription_plans` table. All the data in the column will be lost.
  - You are about to drop the column `monitoring_interval_seconds` on the `subscription_plans` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `subscription_plans` table. All the data in the column will be lost.
  - You are about to drop the `subscription_addons` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `workspace_addons` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `amount` to the `subscription_plans` table without a default value. This is not possible if the table is not empty.
  - Made the column `features` on table `subscription_plans` required. This step will fail if there are existing NULL values in that column.
  - Made the column `payment_method` on table `subscription_transactions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `metadata` on table `subscription_transactions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `razorpay_subscription_id` on table `subscriptions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `razorpay_customer_id` on table `subscriptions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `base_price_snapshot` on table `subscriptions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `currency_snapshot` on table `subscriptions` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "subscription_addons" DROP CONSTRAINT "subscription_addons_plan_id_fkey";

-- DropForeignKey
ALTER TABLE "workspace_addons" DROP CONSTRAINT "workspace_addons_addon_id_fkey";

-- DropForeignKey
ALTER TABLE "workspace_addons" DROP CONSTRAINT "workspace_addons_subscription_id_fkey";

-- AlterTable
ALTER TABLE "subscription_plans" DROP COLUMN "max_monitors",
DROP COLUMN "monitoring_interval_seconds",
DROP COLUMN "price",
ADD COLUMN     "addons" JSONB,
ADD COLUMN     "amount" DECIMAL(65,30) NOT NULL,
ALTER COLUMN "currency" DROP DEFAULT,
ALTER COLUMN "interval_count" DROP DEFAULT,
ALTER COLUMN "features" SET NOT NULL;

-- AlterTable
ALTER TABLE "subscription_transactions" ALTER COLUMN "payment_method" SET NOT NULL,
ALTER COLUMN "metadata" SET NOT NULL;

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "addons" JSONB,
ALTER COLUMN "razorpay_subscription_id" SET NOT NULL,
ALTER COLUMN "razorpay_customer_id" SET NOT NULL,
ALTER COLUMN "base_price_snapshot" SET NOT NULL,
ALTER COLUMN "currency_snapshot" SET NOT NULL;

-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "billing_details" JSONB;

-- DropTable
DROP TABLE "subscription_addons";

-- DropTable
DROP TABLE "workspace_addons";
