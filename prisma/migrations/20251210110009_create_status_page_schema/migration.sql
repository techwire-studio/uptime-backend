-- CreateTable
CREATE TABLE "status_pages" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "custom_domain" TEXT,
    "visibility" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "status_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_StatusPageMonitors" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_StatusPageMonitors_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "status_pages_custom_domain_key" ON "status_pages"("custom_domain");

-- CreateIndex
CREATE INDEX "_StatusPageMonitors_B_index" ON "_StatusPageMonitors"("B");

-- AddForeignKey
ALTER TABLE "status_pages" ADD CONSTRAINT "status_pages_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StatusPageMonitors" ADD CONSTRAINT "_StatusPageMonitors_A_fkey" FOREIGN KEY ("A") REFERENCES "monitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StatusPageMonitors" ADD CONSTRAINT "_StatusPageMonitors_B_fkey" FOREIGN KEY ("B") REFERENCES "status_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
