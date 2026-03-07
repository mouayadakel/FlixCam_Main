-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN "productId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_productId_key" ON "Equipment"("productId");

-- CreateIndex
CREATE INDEX "Equipment_productId_idx" ON "Equipment"("productId");

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
