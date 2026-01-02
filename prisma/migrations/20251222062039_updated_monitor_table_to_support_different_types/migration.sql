-- AlterTable
ALTER TABLE "monitors" ADD COLUMN     "keyword" TEXT,
ADD COLUMN     "keyword_match_type" TEXT,
ADD COLUMN     "port" INTEGER;
