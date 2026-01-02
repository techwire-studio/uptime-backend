/*
  Warnings:

  - You are about to drop the column `monitor_id` on the `tags` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[workspace_id,name]` on the table `tags` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "tags" DROP CONSTRAINT "tags_monitor_id_fkey";

-- DropIndex
DROP INDEX "tags_monitor_id_name_key";

-- AlterTable
ALTER TABLE "tags" DROP COLUMN "monitor_id";

-- CreateTable
CREATE TABLE "monitor_tags" (
    "monitor_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "monitor_tags_pkey" PRIMARY KEY ("monitor_id","tag_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tags_workspace_id_name_key" ON "tags"("workspace_id", "name");

-- AddForeignKey
ALTER TABLE "monitor_tags" ADD CONSTRAINT "monitor_tags_monitor_id_fkey" FOREIGN KEY ("monitor_id") REFERENCES "monitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitor_tags" ADD CONSTRAINT "monitor_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
