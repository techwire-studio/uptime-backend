/*
  Warnings:

  - You are about to drop the column `tags` on the `monitors` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "monitors" DROP COLUMN "tags";

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "monitor_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tags_monitor_id_name_key" ON "tags"("monitor_id", "name");

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_monitor_id_fkey" FOREIGN KEY ("monitor_id") REFERENCES "monitors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
