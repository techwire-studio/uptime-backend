/*
  Warnings:

  - Added the required column `workspace_id` to the `alert_rules` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "alert_rules" ADD COLUMN     "workspace_id" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
