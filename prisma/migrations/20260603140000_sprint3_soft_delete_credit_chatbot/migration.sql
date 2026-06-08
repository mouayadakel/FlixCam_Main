-- Sprint 3: soft delete, credit limit, chatbot settings

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "creditLimit" DECIMAL(12,2);

ALTER TABLE "Cart" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "deletedBy" TEXT;
CREATE INDEX IF NOT EXISTS "Cart_deletedAt_idx" ON "Cart"("deletedAt");

ALTER TABLE "CartItem" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "deletedBy" TEXT;
CREATE INDEX IF NOT EXISTS "CartItem_deletedAt_idx" ON "CartItem"("deletedAt");

ALTER TABLE "StudioSchedule" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "deletedBy" TEXT;
CREATE INDEX IF NOT EXISTS "StudioSchedule_deletedAt_idx" ON "StudioSchedule"("deletedAt");

ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "deletedBy" TEXT;
CREATE INDEX IF NOT EXISTS "Branch_deletedAt_idx" ON "Branch"("deletedAt");

ALTER TABLE "DeliveryZone" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "deletedBy" TEXT;
CREATE INDEX IF NOT EXISTS "DeliveryZone_deletedAt_idx" ON "DeliveryZone"("deletedAt");

CREATE TABLE IF NOT EXISTS "ChatbotSettings" (
    "id" TEXT NOT NULL,
    "greetingAr" TEXT,
    "greetingEn" TEXT,
    "tone" TEXT NOT NULL DEFAULT 'professional',
    "companyName" TEXT,
    "faqEntries" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    CONSTRAINT "ChatbotSettings_pkey" PRIMARY KEY ("id")
);
