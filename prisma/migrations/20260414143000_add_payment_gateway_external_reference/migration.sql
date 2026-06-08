-- Add gateway-agnostic payment reference columns.
ALTER TABLE "Payment"
ADD COLUMN IF NOT EXISTS "gateway" TEXT,
ADD COLUMN IF NOT EXISTS "externalId" TEXT;

-- Backfill existing Tap records into the new generic fields.
UPDATE "Payment"
SET
  "gateway" = COALESCE("gateway", 'tap'),
  "externalId" = COALESCE("externalId", "tapChargeId", "tapTransactionId")
WHERE
  ("tapChargeId" IS NOT NULL OR "tapTransactionId" IS NOT NULL);

-- Add indexes to support provider lookups and reconciliation.
CREATE INDEX IF NOT EXISTS "Payment_gateway_idx" ON "Payment"("gateway");
CREATE INDEX IF NOT EXISTS "Payment_externalId_idx" ON "Payment"("externalId");
