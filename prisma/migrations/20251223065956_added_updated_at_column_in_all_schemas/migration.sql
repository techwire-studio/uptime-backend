/*
  Warnings:

  - Added the required column `updated_at` to the `alert_channels` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `alert_rules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `alerts_sent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `incidents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `monitor_checks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `workspace_members` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `workspaces` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "alert_channels" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "alert_rules" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "alerts_sent" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "incidents" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "monitor_checks" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "workspace_members" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;
