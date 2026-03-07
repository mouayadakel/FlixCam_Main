-- Ensure FaqItem table exists (safe to run if table already exists)
CREATE TABLE IF NOT EXISTS "FaqItem" (
    "id" TEXT NOT NULL,
    "questionAr" TEXT NOT NULL,
    "questionEn" TEXT NOT NULL,
    "questionZh" TEXT,
    "answerAr" TEXT NOT NULL,
    "answerEn" TEXT NOT NULL,
    "answerZh" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    CONSTRAINT "FaqItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FaqItem_order_idx" ON "FaqItem"("order");
CREATE INDEX IF NOT EXISTS "FaqItem_isActive_idx" ON "FaqItem"("isActive");
CREATE INDEX IF NOT EXISTS "FaqItem_deletedAt_idx" ON "FaqItem"("deletedAt");
