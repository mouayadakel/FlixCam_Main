-- CreateTable
CREATE TABLE "AiContentDraft" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "suggestedData" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,

    CONSTRAINT "AiContentDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiContentDraft_productId_idx" ON "AiContentDraft"("productId");

-- CreateIndex
CREATE INDEX "AiContentDraft_status_idx" ON "AiContentDraft"("status");

-- CreateIndex
CREATE INDEX "AiContentDraft_type_idx" ON "AiContentDraft"("type");

-- CreateIndex
CREATE INDEX "AiContentDraft_createdAt_idx" ON "AiContentDraft"("createdAt");

-- AddForeignKey
ALTER TABLE "AiContentDraft" ADD CONSTRAINT "AiContentDraft_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
