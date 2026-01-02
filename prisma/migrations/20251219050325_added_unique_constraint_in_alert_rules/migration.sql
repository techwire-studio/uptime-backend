/*
  Warnings:

  - You are about to drop the column `monitor_id` on the `alert_rules` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[workspace_id,alert_type]` on the table `alert_rules` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "alert_rules" DROP CONSTRAINT "alert_rules_monitor_id_fkey";

-- DropIndex
DROP INDEX "alert_rules_monitor_id_alert_type_key";

-- AlterTable
ALTER TABLE "alert_rules" DROP COLUMN "monitor_id";

-- CreateIndex
CREATE UNIQUE INDEX "alert_rules_workspace_id_alert_type_key" ON "alert_rules"("workspace_id", "alert_type");
