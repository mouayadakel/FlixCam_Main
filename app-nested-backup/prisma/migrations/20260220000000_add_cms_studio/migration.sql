-- Ensure Studio table exists (handles shadow DB where baseline may not have created it)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Studio') THEN
    CREATE TABLE "Studio" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "slug" TEXT NOT NULL,
      "description" TEXT,
      "capacity" INTEGER,
      "hourlyRate" DECIMAL(10,2) NOT NULL,
      "setupBuffer" INTEGER NOT NULL DEFAULT 30,
      "cleaningBuffer" INTEGER NOT NULL DEFAULT 30,
      "resetTime" INTEGER NOT NULL DEFAULT 15,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdBy" TEXT,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedBy" TEXT,
      "deletedAt" TIMESTAMP(3),
      "deletedBy" TEXT,
      CONSTRAINT "Studio_pkey" PRIMARY KEY ("id")
    );
    CREATE UNIQUE INDEX "Studio_slug_key" ON "Studio"("slug");
    CREATE INDEX "Studio_slug_idx" ON "Studio"("slug");
    CREATE INDEX "Studio_isActive_idx" ON "Studio"("isActive");
    CREATE INDEX "Studio_deletedAt_idx" ON "Studio"("deletedAt");
  END IF;
END $$;

-- Ensure Media table exists (shadow DB fallback)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Media') THEN
    CREATE TABLE "Media" (
      "id" TEXT NOT NULL,
      "url" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "filename" TEXT NOT NULL,
      "mimeType" TEXT NOT NULL,
      "size" INTEGER,
      "equipmentId" TEXT,
      "studioId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdBy" TEXT,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedBy" TEXT,
      "deletedAt" TIMESTAMP(3),
      "deletedBy" TEXT,
      CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
    );
  END IF;
END $$;

-- AlterTable
ALTER TABLE "Studio" ADD COLUMN "areaSqm" INTEGER,
ADD COLUMN "studioType" TEXT,
ADD COLUMN "bestUse" TEXT,
ADD COLUMN "availabilityConfidence" TEXT,
ADD COLUMN "videoUrl" TEXT,
ADD COLUMN "galleryDisclaimer" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "googleMapsUrl" TEXT,
ADD COLUMN "arrivalTimeFromCenter" TEXT,
ADD COLUMN "parkingNotes" TEXT,
ADD COLUMN "slotDurationMinutes" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN "dailyRate" DECIMAL(10,2),
ADD COLUMN "minHours" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "durationOptions" TEXT,
ADD COLUMN "bookingDisclaimer" TEXT,
ADD COLUMN "vatIncluded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "whatsIncluded" TEXT,
ADD COLUMN "notIncluded" TEXT,
ADD COLUMN "hasElectricity" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "hasAC" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "hasChangingRooms" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "rulesText" TEXT,
ADD COLUMN "smokingPolicy" TEXT,
ADD COLUMN "foodPolicy" TEXT,
ADD COLUMN "equipmentCarePolicy" TEXT,
ADD COLUMN "cancellationPolicyShort" TEXT,
ADD COLUMN "cancellationPolicyLink" TEXT,
ADD COLUMN "reviewsText" TEXT,
ADD COLUMN "whatsappNumber" TEXT,
ADD COLUMN "metaTitle" TEXT,
ADD COLUMN "metaDescription" TEXT;

-- AlterTable
ALTER TABLE "Media" ADD COLUMN "sortOrder" INTEGER DEFAULT 0,
ADD COLUMN "altText" TEXT;

-- CreateTable
CREATE TABLE "StudioPackage" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "description" TEXT,
    "includes" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "originalPrice" DECIMAL(10,2),
    "discountPercent" INTEGER,
    "hours" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "StudioPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioFaq" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "questionAr" TEXT NOT NULL,
    "questionEn" TEXT,
    "questionZh" TEXT,
    "answerAr" TEXT NOT NULL,
    "answerEn" TEXT,
    "answerZh" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "StudioFaq_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudioPackage_studioId_idx" ON "StudioPackage"("studioId");

-- CreateIndex
CREATE INDEX "StudioPackage_order_idx" ON "StudioPackage"("order");

-- CreateIndex
CREATE INDEX "StudioPackage_deletedAt_idx" ON "StudioPackage"("deletedAt");

-- CreateIndex
CREATE INDEX "StudioFaq_studioId_idx" ON "StudioFaq"("studioId");

-- CreateIndex
CREATE INDEX "StudioFaq_order_idx" ON "StudioFaq"("order");

-- CreateIndex
CREATE INDEX "StudioFaq_deletedAt_idx" ON "StudioFaq"("deletedAt");

-- AddForeignKey
ALTER TABLE "StudioPackage" ADD CONSTRAINT "StudioPackage_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioFaq" ADD CONSTRAINT "StudioFaq_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
