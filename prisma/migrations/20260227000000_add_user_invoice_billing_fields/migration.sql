-- Add optional invoice/billing fields to User (tax info, company name, natural location)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "taxId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "companyName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "billingAddress" TEXT;
