-- AlterTable
ALTER TABLE "NewsletterSubscription" ADD COLUMN IF NOT EXISTS "name" TEXT,
ADD COLUMN IF NOT EXISTS "language" TEXT NOT NULL DEFAULT 'ar',
ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS "mailchimpId" TEXT;

CREATE INDEX IF NOT EXISTS "NewsletterSubscription_status_idx" ON "NewsletterSubscription"("status");

-- CreateTable
CREATE TABLE IF NOT EXISTS "MarketingSettings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "MarketingSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MarketingSettings_key_key" ON "MarketingSettings"("key");

-- CreateTable
CREATE TABLE IF NOT EXISTS "MarketingEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "source" TEXT,
    "pageUrl" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "value" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "sessionId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MarketingEvent_eventType_createdAt_idx" ON "MarketingEvent"("eventType", "createdAt");
CREATE INDEX IF NOT EXISTS "MarketingEvent_createdAt_idx" ON "MarketingEvent"("createdAt");
