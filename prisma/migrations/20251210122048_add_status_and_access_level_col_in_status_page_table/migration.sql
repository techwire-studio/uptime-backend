/*
  Warnings:

  - You are about to drop the column `visibility` on the `status_pages` table. All the data in the column will be lost.
  - Added the required column `access_level` to the `status_pages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `status_pages` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "status_pages" DROP COLUMN "visibility",
ADD COLUMN     "access_level" TEXT NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL;
