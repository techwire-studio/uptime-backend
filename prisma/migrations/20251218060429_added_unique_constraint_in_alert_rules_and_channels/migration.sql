/*
  Warnings:

  - A unique constraint covering the columns `[workspace_id,type,destination]` on the table `alert_channels` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[monitor_id,alert_type]` on the table `alert_rules` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "alert_channels_workspace_id_type_destination_key" ON "alert_channels"("workspace_id", "type", "destination");

-- CreateIndex
CREATE UNIQUE INDEX "alert_rules_monitor_id_alert_type_key" ON "alert_rules"("monitor_id", "alert_type");
