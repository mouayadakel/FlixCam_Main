-- AlterTable: Add photo-only metadata to ProductImage for exact-match equipment sourcing
ALTER TABLE "ProductImage" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProductImage" ADD COLUMN "isPrimary" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ProductImage" ADD COLUMN "sourceQuery" TEXT;
ALTER TABLE "ProductImage" ADD COLUMN "sourceDomain" TEXT;
ALTER TABLE "ProductImage" ADD COLUMN "matchScore" DOUBLE PRECISION;
ALTER TABLE "ProductImage" ADD COLUMN "scoreBreakdown" JSONB;
ALTER TABLE "ProductImage" ADD COLUMN "reviewReason" TEXT;
ALTER TABLE "ProductImage" ADD COLUMN "rejectionReason" TEXT;
ALTER TABLE "ProductImage" ADD COLUMN "cloudinaryPublicId" TEXT;
