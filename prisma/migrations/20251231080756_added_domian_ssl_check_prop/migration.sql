-- AlterTable
ALTER TABLE "monitors" ADD COLUMN     "check_ssl_errors" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "domain_expiry_reminders" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ssl_expiry_reminders" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "check_regions" SET NOT NULL,
ALTER COLUMN "check_regions" SET DATA TYPE TEXT;
