-- CreateTable
CREATE TABLE "HeroBanner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pageSlug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "autoPlay" BOOLEAN NOT NULL DEFAULT true,
    "autoPlayInterval" INTEGER NOT NULL DEFAULT 6000,
    "transitionType" TEXT NOT NULL DEFAULT 'fade',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "HeroBanner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HeroSlide" (
    "id" TEXT NOT NULL,
    "bannerId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "mobileImageUrl" TEXT,
    "videoUrl" TEXT,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleZh" TEXT,
    "subtitleAr" TEXT,
    "subtitleEn" TEXT,
    "subtitleZh" TEXT,
    "badgeTextAr" TEXT,
    "badgeTextEn" TEXT,
    "badgeTextZh" TEXT,
    "ctaTextAr" TEXT,
    "ctaTextEn" TEXT,
    "ctaTextZh" TEXT,
    "ctaUrl" TEXT,
    "ctaStyle" TEXT NOT NULL DEFAULT 'primary',
    "cta2TextAr" TEXT,
    "cta2TextEn" TEXT,
    "cta2TextZh" TEXT,
    "cta2Url" TEXT,
    "cta2Style" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "overlayOpacity" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "textPosition" TEXT NOT NULL DEFAULT 'start',
    "publishAt" TIMESTAMP(3),
    "unpublishAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "HeroSlide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HeroBanner_pageSlug_key" ON "HeroBanner"("pageSlug");

-- CreateIndex
CREATE INDEX "HeroBanner_isActive_idx" ON "HeroBanner"("isActive");

-- CreateIndex
CREATE INDEX "HeroBanner_deletedAt_idx" ON "HeroBanner"("deletedAt");

-- CreateIndex
CREATE INDEX "HeroSlide_bannerId_idx" ON "HeroSlide"("bannerId");

-- CreateIndex
CREATE INDEX "HeroSlide_order_idx" ON "HeroSlide"("order");

-- CreateIndex
CREATE INDEX "HeroSlide_isActive_idx" ON "HeroSlide"("isActive");

-- CreateIndex
CREATE INDEX "HeroSlide_deletedAt_idx" ON "HeroSlide"("deletedAt");

-- AddForeignKey
ALTER TABLE "HeroSlide" ADD CONSTRAINT "HeroSlide_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "HeroBanner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
