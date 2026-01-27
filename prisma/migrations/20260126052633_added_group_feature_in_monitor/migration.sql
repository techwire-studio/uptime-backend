/*
  Warnings:

  - Added the required column `group` to the `monitors` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "monitors" ADD COLUMN     "group" TEXT NOT NULL;
