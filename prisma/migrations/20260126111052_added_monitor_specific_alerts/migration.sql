-- CreateTable
CREATE TABLE "alert_channel_monitors" (
    "channel_id" TEXT NOT NULL,
    "monitor_id" TEXT NOT NULL,

    CONSTRAINT "alert_channel_monitors_pkey" PRIMARY KEY ("channel_id","monitor_id")
);

-- CreateIndex
CREATE INDEX "alert_channel_monitors_monitor_id_idx" ON "alert_channel_monitors"("monitor_id");

-- AddForeignKey
ALTER TABLE "alert_channel_monitors" ADD CONSTRAINT "alert_channel_monitors_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "alert_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_channel_monitors" ADD CONSTRAINT "alert_channel_monitors_monitor_id_fkey" FOREIGN KEY ("monitor_id") REFERENCES "monitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
