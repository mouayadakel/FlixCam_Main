-- Ensure PolicyItem table exists (from 20260221095309 that was skipped)
CREATE TABLE IF NOT EXISTS "PolicyItem" (
    "id" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleZh" TEXT,
    "bodyAr" TEXT NOT NULL,
    "bodyEn" TEXT NOT NULL,
    "bodyZh" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    CONSTRAINT "PolicyItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PolicyItem_order_idx" ON "PolicyItem"("order");
CREATE INDEX IF NOT EXISTS "PolicyItem_isActive_idx" ON "PolicyItem"("isActive");
CREATE INDEX IF NOT EXISTS "PolicyItem_deletedAt_idx" ON "PolicyItem"("deletedAt");
