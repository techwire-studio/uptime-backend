/*
  Warnings:

  - Added the required column `workspace_id` to the `incidents` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "monitors" DROP CONSTRAINT "monitors_workspace_id_fkey";

-- AlterTable
ALTER TABLE "incidents" ADD COLUMN     "workspace_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "monitors" ALTER COLUMN "max_retries" SET DEFAULT 0;

-- CreateIndex
CREATE INDEX "monitors_workspace_id_idx" ON "monitors"("workspace_id");

-- AddForeignKey
ALTER TABLE "monitors" ADD CONSTRAINT "monitors_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
