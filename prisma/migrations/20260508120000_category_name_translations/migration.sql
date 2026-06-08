-- Add localized name fields to Category
ALTER TABLE "Category"
ADD COLUMN     "nameEn" TEXT,
ADD COLUMN     "nameZh" TEXT,
ADD COLUMN     "nameFr" TEXT;

