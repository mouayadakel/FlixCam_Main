-- AlterTable
-- Add qrCodeData to Equipment (was in schema but never migrated; caused 500 on production)
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "qrCodeData" TEXT;
