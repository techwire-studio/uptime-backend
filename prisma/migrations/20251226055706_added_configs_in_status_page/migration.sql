/*
  Warnings:

  - The `expected_status` column on the `monitors` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `check_regions` column on the `monitors` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "monitors" DROP COLUMN "expected_status",
ADD COLUMN     "expected_status" INTEGER[],
DROP COLUMN "check_regions",
ADD COLUMN     "check_regions" TEXT[];

-- AlterTable
ALTER TABLE "status_pages" ADD COLUMN     "configs" JSONB;
