/*
  Warnings:

  - You are about to drop the column `nameEn` on the `Brand` table. All the data in the column will be lost.
  - You are about to drop the column `nameZh` on the `Brand` table. All the data in the column will be lost.
  - You are about to drop the column `descriptionEn` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `descriptionZh` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `nameEn` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `nameZh` on the `Category` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ImageSource" AS ENUM ('UPLOAD', 'BRAND_ASSET', 'AI_GENERATED', 'STOCK_PHOTO', 'WEB_SCRAPED');

-- CreateEnum
CREATE TYPE "AiJobType" AS ENUM ('TEXT_BACKFILL', 'PHOTO_BACKFILL', 'SPEC_BACKFILL', 'FULL_BACKFILL', 'EMBEDDING_BACKFILL');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- DropIndex (IF EXISTS for idempotency when index was never created or already dropped)
DROP INDEX IF EXISTS "Equipment_nameEn_idx";
DROP INDEX IF EXISTS "Equipment_nameZh_idx";
DROP INDEX IF EXISTS "Kit_nameEn_idx";
DROP INDEX IF EXISTS "Kit_nameZh_idx";
DROP INDEX IF EXISTS "Studio_nameEn_idx";
DROP INDEX IF EXISTS "Studio_nameZh_idx";

-- AlterTable
ALTER TABLE "AISettings" ADD COLUMN     "backfillEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "currentDailySpend" DECIMAL(10,4) DEFAULT 0,
ADD COLUMN     "currentMonthlySpend" DECIMAL(10,4) DEFAULT 0,
ADD COLUMN     "dailyBudgetUsd" DECIMAL(10,2),
ADD COLUMN     "monthlyBudgetUsd" DECIMAL(10,2),
ADD COLUMN     "monthlyResetDate" TIMESTAMP(3),
ADD COLUMN     "nightlyCronEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "nightlyCronTime" TEXT DEFAULT '02:00',
ADD COLUMN     "spendResetDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Brand" DROP COLUMN "nameEn",
DROP COLUMN "nameZh";

-- AlterTable
ALTER TABLE "Category" DROP COLUMN "descriptionEn",
DROP COLUMN "descriptionZh",
DROP COLUMN "nameEn",
DROP COLUMN "nameZh";

-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN     "applicableStudioIds" JSONB;

-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN     "aiSuggestions" JSONB,
ADD COLUMN     "specBlacklist" JSONB,
ADD COLUMN     "specConfidence" DOUBLE PRECISION,
ADD COLUMN     "specLastInferredAt" TIMESTAMP(3),
ADD COLUMN     "specSource" TEXT;

-- AlterTable
ALTER TABLE "PricingRule" ADD COLUMN     "appliedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalImpact" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "aiContentFlags" JSONB,
ADD COLUMN     "aiReviewReason" TEXT,
ADD COLUMN     "aiRunCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "contentQualityScore" INTEGER,
ADD COLUMN     "contentScore" INTEGER,
ADD COLUMN     "contentScoreAt" TIMESTAMP(3),
ADD COLUMN     "lastAiRunAt" TIMESTAMP(3),
ADD COLUMN     "needsAiReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "photoStatus" TEXT DEFAULT 'unknown';

-- AlterTable
ALTER TABLE "Studio" ADD COLUMN     "bookingCountDisplay" INTEGER,
ADD COLUMN     "discountActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "discountMessage" TEXT,
ADD COLUMN     "discountPercent" INTEGER,
ADD COLUMN     "hasWifi" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "heroTagline" TEXT;

-- AlterTable
ALTER TABLE "StudioAddOn" ADD COLUMN     "category" TEXT,
ADD COLUMN     "iconName" TEXT,
ADD COLUMN     "originalPrice" DECIMAL(10,2),
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "StudioFaq" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "StudioPackage" ADD COLUMN     "badgeText" TEXT,
ADD COLUMN     "descriptionAr" TEXT,
ADD COLUMN     "nameZh" TEXT,
ADD COLUMN     "recommended" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "imageSource" "ImageSource" NOT NULL DEFAULT 'UPLOAD',
    "pendingReview" BOOLEAN NOT NULL DEFAULT false,
    "qualityScore" DOUBLE PRECISION,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiJob" (
    "id" TEXT NOT NULL,
    "type" "AiJobType" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "triggeredBy" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "succeeded" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "errorLog" JSONB,
    "metadata" JSONB,

    CONSTRAINT "AiJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiJobItem" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "costIncurred" DOUBLE PRECISION,
    "provider" TEXT,
    "fieldsUpdated" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiJobItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogQualitySnapshot" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "avgScore" DOUBLE PRECISION NOT NULL,
    "totalProducts" INTEGER NOT NULL,
    "gapCounts" JSONB NOT NULL,

    CONSTRAINT "CatalogQualitySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiDailyCost" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "feature" TEXT NOT NULL,
    "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "jobCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AiDailyCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioTestimonial" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "text" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "avatarUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "StudioTestimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioSchedule" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "openTime" TEXT NOT NULL,
    "closeTime" TEXT NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaqItem" (
    "id" TEXT NOT NULL,
    "questionAr" TEXT NOT NULL,
    "questionEn" TEXT NOT NULL,
    "questionZh" TEXT,
    "answerAr" TEXT NOT NULL,
    "answerEn" TEXT NOT NULL,
    "answerZh" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "FaqItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyItem" (
    "id" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleZh" TEXT,
    "bodyAr" TEXT NOT NULL,
    "bodyEn" TEXT NOT NULL,
    "bodyZh" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "PolicyItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiFeedback" (
    "id" TEXT NOT NULL,
    "draftId" TEXT,
    "contentType" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "rejectionReason" TEXT,
    "originalValue" TEXT,
    "finalValue" TEXT,
    "provider" TEXT,
    "promptHash" TEXT,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ColumnMappingHistory" (
    "id" TEXT NOT NULL,
    "sourceHeader" TEXT NOT NULL,
    "mappedField" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL DEFAULT 1,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "ColumnMappingHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductImage_productId_idx" ON "ProductImage"("productId");

-- CreateIndex
CREATE INDEX "ProductImage_pendingReview_idx" ON "ProductImage"("pendingReview");

-- CreateIndex
CREATE INDEX "ProductImage_imageSource_idx" ON "ProductImage"("imageSource");

-- CreateIndex
CREATE INDEX "AiJob_status_idx" ON "AiJob"("status");

-- CreateIndex
CREATE INDEX "AiJob_type_idx" ON "AiJob"("type");

-- CreateIndex
CREATE INDEX "AiJob_triggeredAt_idx" ON "AiJob"("triggeredAt");

-- CreateIndex
CREATE INDEX "AiJobItem_jobId_idx" ON "AiJobItem"("jobId");

-- CreateIndex
CREATE INDEX "AiJobItem_productId_idx" ON "AiJobItem"("productId");

-- CreateIndex
CREATE INDEX "AiJobItem_status_idx" ON "AiJobItem"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogQualitySnapshot_date_key" ON "CatalogQualitySnapshot"("date");

-- CreateIndex
CREATE INDEX "CatalogQualitySnapshot_date_idx" ON "CatalogQualitySnapshot"("date");

-- CreateIndex
CREATE INDEX "AiDailyCost_date_idx" ON "AiDailyCost"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AiDailyCost_date_feature_key" ON "AiDailyCost"("date", "feature");

-- CreateIndex
CREATE INDEX "StudioTestimonial_studioId_idx" ON "StudioTestimonial"("studioId");

-- CreateIndex
CREATE INDEX "StudioTestimonial_order_idx" ON "StudioTestimonial"("order");

-- CreateIndex
CREATE INDEX "StudioTestimonial_deletedAt_idx" ON "StudioTestimonial"("deletedAt");

-- CreateIndex
CREATE INDEX "StudioSchedule_studioId_idx" ON "StudioSchedule"("studioId");

-- CreateIndex
CREATE UNIQUE INDEX "StudioSchedule_studioId_dayOfWeek_key" ON "StudioSchedule"("studioId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "FaqItem_order_idx" ON "FaqItem"("order");

-- CreateIndex
CREATE INDEX "FaqItem_isActive_idx" ON "FaqItem"("isActive");

-- CreateIndex
CREATE INDEX "FaqItem_deletedAt_idx" ON "FaqItem"("deletedAt");

-- CreateIndex
CREATE INDEX "PolicyItem_order_idx" ON "PolicyItem"("order");

-- CreateIndex
CREATE INDEX "PolicyItem_isActive_idx" ON "PolicyItem"("isActive");

-- CreateIndex
CREATE INDEX "PolicyItem_deletedAt_idx" ON "PolicyItem"("deletedAt");

-- CreateIndex
CREATE INDEX "AiFeedback_contentType_idx" ON "AiFeedback"("contentType");

-- CreateIndex
CREATE INDEX "AiFeedback_action_idx" ON "AiFeedback"("action");

-- CreateIndex
CREATE INDEX "AiFeedback_categoryId_idx" ON "AiFeedback"("categoryId");

-- CreateIndex
CREATE INDEX "AiFeedback_provider_idx" ON "AiFeedback"("provider");

-- CreateIndex
CREATE INDEX "AiFeedback_createdAt_idx" ON "AiFeedback"("createdAt");

-- CreateIndex
CREATE INDEX "ColumnMappingHistory_sourceHeader_idx" ON "ColumnMappingHistory"("sourceHeader");

-- CreateIndex
CREATE INDEX "ColumnMappingHistory_frequency_idx" ON "ColumnMappingHistory"("frequency");

-- CreateIndex
CREATE UNIQUE INDEX "ColumnMappingHistory_sourceHeader_mappedField_key" ON "ColumnMappingHistory"("sourceHeader", "mappedField");

-- CreateIndex
CREATE INDEX "StudioAddOn_sortOrder_idx" ON "StudioAddOn"("sortOrder");

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiJobItem" ADD CONSTRAINT "AiJobItem_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "AiJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioTestimonial" ADD CONSTRAINT "StudioTestimonial_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioSchedule" ADD CONSTRAINT "StudioSchedule_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
