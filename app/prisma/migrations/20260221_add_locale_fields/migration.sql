-- Add locale-specific fields to Equipment table
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "nameEn" TEXT;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "nameZh" TEXT;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "descriptionEn" TEXT;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "descriptionZh" TEXT;

-- Add locale-specific fields to Studio table
ALTER TABLE "Studio" ADD COLUMN IF NOT EXISTS "nameEn" TEXT;
ALTER TABLE "Studio" ADD COLUMN IF NOT EXISTS "nameZh" TEXT;
ALTER TABLE "Studio" ADD COLUMN IF NOT EXISTS "descriptionEn" TEXT;
ALTER TABLE "Studio" ADD COLUMN IF NOT EXISTS "descriptionZh" TEXT;
ALTER TABLE "Studio" ADD COLUMN IF NOT EXISTS "heroTaglineEn" TEXT;
ALTER TABLE "Studio" ADD COLUMN IF NOT EXISTS "heroTaglineZh" TEXT;

-- Add locale-specific fields to Kit table
ALTER TABLE "Kit" ADD COLUMN IF NOT EXISTS "nameEn" TEXT;
ALTER TABLE "Kit" ADD COLUMN IF NOT EXISTS "nameZh" TEXT;
ALTER TABLE "Kit" ADD COLUMN IF NOT EXISTS "descriptionEn" TEXT;
ALTER TABLE "Kit" ADD COLUMN IF NOT EXISTS "descriptionZh" TEXT;

-- Add locale-specific fields to Category table
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "nameEn" TEXT;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "nameZh" TEXT;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "descriptionEn" TEXT;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "descriptionZh" TEXT;

-- Add locale-specific fields to Brand table
ALTER TABLE "Brand" ADD COLUMN IF NOT EXISTS "nameEn" TEXT;
ALTER TABLE "Brand" ADD COLUMN IF NOT EXISTS "nameZh" TEXT;

-- Create indexes for locale fields
CREATE INDEX IF NOT EXISTS "Equipment_nameEn_idx" ON "Equipment"("nameEn");
CREATE INDEX IF NOT EXISTS "Equipment_nameZh_idx" ON "Equipment"("nameZh");
CREATE INDEX IF NOT EXISTS "Studio_nameEn_idx" ON "Studio"("nameEn");
CREATE INDEX IF NOT EXISTS "Studio_nameZh_idx" ON "Studio"("nameZh");
CREATE INDEX IF NOT EXISTS "Kit_nameEn_idx" ON "Kit"("nameEn");
CREATE INDEX IF NOT EXISTS "Kit_nameZh_idx" ON "Kit"("nameZh");
