-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN "slug" TEXT;

-- CreateIndex (unique but nullable)
CREATE UNIQUE INDEX "Equipment_slug_key" ON "Equipment"("slug");

-- CreateIndex (for lookup performance)
CREATE INDEX "Equipment_slug_idx" ON "Equipment"("slug");
