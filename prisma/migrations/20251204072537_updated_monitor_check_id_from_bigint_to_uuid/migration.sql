/*
  Warnings:

  - The primary key for the `monitor_checks` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "monitor_checks" DROP CONSTRAINT "monitor_checks_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "monitor_checks_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "monitor_checks_id_seq";

-- AlterTable
ALTER TABLE "monitors" ALTER COLUMN "interval_seconds" SET DEFAULT 60,
ALTER COLUMN "timeout_ms" SET DEFAULT 5000,
ALTER COLUMN "status" SET DEFAULT 'healthy',
ALTER COLUMN "consecutive_failures" SET DEFAULT 2,
ALTER COLUMN "max_retries" SET DEFAULT 3;
