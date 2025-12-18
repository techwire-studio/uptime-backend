/*
  Warnings:

  - You are about to drop the column `notify_after_failures` on the `alert_rules` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "alert_rules" DROP COLUMN "notify_after_failures",
ADD COLUMN     "events" TEXT[];
