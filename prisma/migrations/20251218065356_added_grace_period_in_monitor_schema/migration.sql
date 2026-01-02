-- AlterTable
ALTER TABLE "monitors" ADD COLUMN     "grace_period" INTEGER,
ALTER COLUMN "url" DROP NOT NULL,
ALTER COLUMN "expected_status" DROP NOT NULL,
ALTER COLUMN "check_regions" DROP NOT NULL;
