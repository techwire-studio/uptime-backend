/*
  Warnings:

  - Made the column `url` on table `monitors` required. This step will fail if there are existing NULL values in that column.
  - Made the column `expected_status` on table `monitors` required. This step will fail if there are existing NULL values in that column.
  - Made the column `check_regions` on table `monitors` required. This step will fail if there are existing NULL values in that column.
  - Made the column `next_run_at` on table `monitors` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "monitors" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "url" SET NOT NULL,
ALTER COLUMN "expected_status" SET NOT NULL,
ALTER COLUMN "check_regions" SET NOT NULL,
ALTER COLUMN "next_run_at" SET NOT NULL;
