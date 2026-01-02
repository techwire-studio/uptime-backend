/*
  Warnings:

  - Added the required column `publish_on_status_page` to the `incident_comments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "incident_comments" ADD COLUMN     "publish_on_status_page" BOOLEAN NOT NULL;
