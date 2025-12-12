/*
  Warnings:

  - The primary key for the `alerts_sent` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "alerts_sent" DROP CONSTRAINT "alerts_sent_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "message" DROP NOT NULL,
ADD CONSTRAINT "alerts_sent_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "alerts_sent_id_seq";
