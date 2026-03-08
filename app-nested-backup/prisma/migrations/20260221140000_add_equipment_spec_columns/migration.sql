-- Add Equipment columns that may be missing (from 20260221095309 that was skipped)
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "aiSuggestions" JSONB;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "specBlacklist" JSONB;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "specConfidence" DOUBLE PRECISION;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "specLastInferredAt" TIMESTAMP(3);
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "specSource" TEXT;
