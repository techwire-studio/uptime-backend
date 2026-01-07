/*
  Warnings:

  - A unique constraint covering the columns `[razorpay_customer_id]` on the table `workspaces` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "addons_snapshot" JSONB,
ADD COLUMN     "base_price_snapshot" DECIMAL(65,30),
ADD COLUMN     "currency_snapshot" TEXT DEFAULT 'INR',
ADD COLUMN     "is_current" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "current_plan_type" TEXT NOT NULL DEFAULT 'free',
ADD COLUMN     "razorpay_customer_id" TEXT;

-- CreateIndex
CREATE INDEX "subscriptions_is_current_idx" ON "subscriptions"("is_current");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_razorpay_customer_id_key" ON "workspaces"("razorpay_customer_id");
