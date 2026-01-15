-- CreateTable
CREATE TABLE "maintenance" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "project_ids" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_workspace_id_key" ON "maintenance"("workspace_id");

-- AddForeignKey
ALTER TABLE "maintenance" ADD CONSTRAINT "maintenance_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
