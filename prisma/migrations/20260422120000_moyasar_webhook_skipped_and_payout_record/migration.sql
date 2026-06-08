-- [FIX 3] Distinct queue outcome for intentionally ignored Moyasar payout/balance rows
ALTER TYPE "EventStatus" ADD VALUE 'SKIPPED';

-- [FIX 4] Persist Moyasar payout / balance webhook payloads for ops and reconciliation
CREATE TABLE "MoyasarPayoutWebhookRecord" (
    "id" TEXT NOT NULL,
    "moyasarResourceId" TEXT NOT NULL,
    "eventClass" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "amountHalalah" INTEGER,
    "currency" TEXT DEFAULT 'SAR',
    "failureReason" TEXT,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoyasarPayoutWebhookRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MoyasarPayoutWebhookRecord_moyasarResourceId_key" ON "MoyasarPayoutWebhookRecord"("moyasarResourceId");
CREATE INDEX "MoyasarPayoutWebhookRecord_eventType_idx" ON "MoyasarPayoutWebhookRecord"("eventType");
CREATE INDEX "MoyasarPayoutWebhookRecord_eventClass_idx" ON "MoyasarPayoutWebhookRecord"("eventClass");
