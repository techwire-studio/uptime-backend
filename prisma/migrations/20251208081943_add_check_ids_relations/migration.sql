-- AlterTable
ALTER TABLE "incidents" ADD COLUMN     "check_id" TEXT,
ADD COLUMN     "resolved_check_id" TEXT;

-- AlterTable
ALTER TABLE "monitors" ADD COLUMN     "tags" TEXT[],
ALTER COLUMN "consecutive_failures" SET DEFAULT 0;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_check_id_fkey" FOREIGN KEY ("check_id") REFERENCES "monitor_checks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_resolved_check_id_fkey" FOREIGN KEY ("resolved_check_id") REFERENCES "monitor_checks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
