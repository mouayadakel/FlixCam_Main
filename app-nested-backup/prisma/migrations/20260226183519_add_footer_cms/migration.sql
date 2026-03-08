-- CreateTable
CREATE TABLE "FooterSettings" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "layout" TEXT NOT NULL DEFAULT 'default',
    "backgroundColor" TEXT NOT NULL DEFAULT '#1a1a1a',
    "textColor" TEXT NOT NULL DEFAULT '#ffffff',
    "linkColor" TEXT NOT NULL DEFAULT '#10b981',
    "linkHoverColor" TEXT NOT NULL DEFAULT '#34d399',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FooterSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FooterBrand" (
    "id" TEXT NOT NULL,
    "footerId" TEXT NOT NULL,
    "logoLight" TEXT NOT NULL,
    "logoDark" TEXT NOT NULL,
    "companyNameAr" TEXT NOT NULL,
    "companyNameEn" TEXT NOT NULL,
    "descriptionAr" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "showBrand" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FooterBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FooterContact" (
    "id" TEXT NOT NULL,
    "footerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "labelAr" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "icon" TEXT,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mapsLink" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FooterContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FooterSocialLink" (
    "id" TEXT NOT NULL,
    "footerId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "displayNameAr" TEXT,
    "displayNameEn" TEXT,
    "customIcon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FooterSocialLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FooterColumn" (
    "id" TEXT NOT NULL,
    "footerId" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "showTitle" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FooterColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FooterLink" (
    "id" TEXT NOT NULL,
    "columnId" TEXT NOT NULL,
    "textAr" TEXT NOT NULL,
    "textEn" TEXT NOT NULL,
    "linkType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "icon" TEXT,
    "openNewTab" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "categoryId" TEXT,
    "pageSlug" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FooterLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FooterLegal" (
    "id" TEXT NOT NULL,
    "footerId" TEXT NOT NULL,
    "copyrightAr" TEXT NOT NULL,
    "copyrightEn" TEXT NOT NULL,
    "autoYear" BOOLEAN NOT NULL DEFAULT true,
    "layout" TEXT NOT NULL DEFAULT 'center',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FooterLegal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FooterLegalLink" (
    "id" TEXT NOT NULL,
    "legalId" TEXT NOT NULL,
    "textAr" TEXT NOT NULL,
    "textEn" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FooterLegalLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FooterNewsletter" (
    "id" TEXT NOT NULL,
    "footerId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "descriptionAr" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "placeholderAr" TEXT NOT NULL,
    "placeholderEn" TEXT NOT NULL,
    "buttonTextAr" TEXT NOT NULL,
    "buttonTextEn" TEXT NOT NULL,
    "successMessageAr" TEXT NOT NULL,
    "successMessageEn" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FooterNewsletter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FooterBrand_footerId_key" ON "FooterBrand"("footerId");

-- CreateIndex
CREATE INDEX "FooterContact_footerId_order_idx" ON "FooterContact"("footerId", "order");

-- CreateIndex
CREATE INDEX "FooterSocialLink_footerId_order_idx" ON "FooterSocialLink"("footerId", "order");

-- CreateIndex
CREATE INDEX "FooterColumn_footerId_order_idx" ON "FooterColumn"("footerId", "order");

-- CreateIndex
CREATE INDEX "FooterLink_columnId_order_idx" ON "FooterLink"("columnId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "FooterLegal_footerId_key" ON "FooterLegal"("footerId");

-- CreateIndex
CREATE INDEX "FooterLegalLink_legalId_order_idx" ON "FooterLegalLink"("legalId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "FooterNewsletter_footerId_key" ON "FooterNewsletter"("footerId");

-- AddForeignKey
ALTER TABLE "FooterBrand" ADD CONSTRAINT "FooterBrand_footerId_fkey" FOREIGN KEY ("footerId") REFERENCES "FooterSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FooterContact" ADD CONSTRAINT "FooterContact_footerId_fkey" FOREIGN KEY ("footerId") REFERENCES "FooterSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FooterSocialLink" ADD CONSTRAINT "FooterSocialLink_footerId_fkey" FOREIGN KEY ("footerId") REFERENCES "FooterSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FooterColumn" ADD CONSTRAINT "FooterColumn_footerId_fkey" FOREIGN KEY ("footerId") REFERENCES "FooterSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FooterLink" ADD CONSTRAINT "FooterLink_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "FooterColumn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FooterLegal" ADD CONSTRAINT "FooterLegal_footerId_fkey" FOREIGN KEY ("footerId") REFERENCES "FooterSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FooterLegalLink" ADD CONSTRAINT "FooterLegalLink_legalId_fkey" FOREIGN KEY ("legalId") REFERENCES "FooterLegal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FooterNewsletter" ADD CONSTRAINT "FooterNewsletter_footerId_fkey" FOREIGN KEY ("footerId") REFERENCES "FooterSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
