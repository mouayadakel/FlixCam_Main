-- CreateEnum
CREATE TYPE "BudgetTier" AS ENUM ('ESSENTIAL', 'PROFESSIONAL', 'PREMIUM');

-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN "budgetTier" "BudgetTier";

-- CreateTable
CREATE TABLE "ShootType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "nameAr" TEXT,
    "nameZh" TEXT,
    "descriptionAr" TEXT,
    "descriptionZh" TEXT,
    "icon" TEXT,
    "coverImageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "questionnaire" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "ShootType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShootTypeCategoryFlow" (
    "id" TEXT NOT NULL,
    "shootTypeId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "minRecommended" INTEGER,
    "maxRecommended" INTEGER,
    "stepTitle" TEXT,
    "stepTitleAr" TEXT,
    "stepDescription" TEXT,
    "stepDescriptionAr" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShootTypeCategoryFlow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShootTypeRecommendation" (
    "id" TEXT NOT NULL,
    "shootTypeId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "budgetTier" "BudgetTier" NOT NULL,
    "reason" TEXT,
    "reasonAr" TEXT,
    "defaultQuantity" INTEGER NOT NULL DEFAULT 1,
    "isAutoSelect" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShootTypeRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShootType_slug_key" ON "ShootType"("slug");

-- CreateIndex
CREATE INDEX "ShootType_slug_idx" ON "ShootType"("slug");

-- CreateIndex
CREATE INDEX "ShootType_isActive_idx" ON "ShootType"("isActive");

-- CreateIndex
CREATE INDEX "ShootType_deletedAt_idx" ON "ShootType"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShootTypeCategoryFlow_shootTypeId_categoryId_key" ON "ShootTypeCategoryFlow"("shootTypeId", "categoryId");

-- CreateIndex
CREATE INDEX "ShootTypeCategoryFlow_shootTypeId_idx" ON "ShootTypeCategoryFlow"("shootTypeId");

-- CreateIndex
CREATE INDEX "ShootTypeCategoryFlow_categoryId_idx" ON "ShootTypeCategoryFlow"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ShootTypeRecommendation_shootTypeId_equipmentId_key" ON "ShootTypeRecommendation"("shootTypeId", "equipmentId");

-- CreateIndex
CREATE INDEX "ShootTypeRecommendation_shootTypeId_idx" ON "ShootTypeRecommendation"("shootTypeId");

-- CreateIndex
CREATE INDEX "ShootTypeRecommendation_equipmentId_idx" ON "ShootTypeRecommendation"("equipmentId");

-- CreateIndex
CREATE INDEX "ShootTypeRecommendation_budgetTier_idx" ON "ShootTypeRecommendation"("budgetTier");

-- CreateIndex
CREATE INDEX "Equipment_budgetTier_idx" ON "Equipment"("budgetTier");

-- AddForeignKey
ALTER TABLE "ShootTypeCategoryFlow" ADD CONSTRAINT "ShootTypeCategoryFlow_shootTypeId_fkey" FOREIGN KEY ("shootTypeId") REFERENCES "ShootType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShootTypeCategoryFlow" ADD CONSTRAINT "ShootTypeCategoryFlow_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShootTypeRecommendation" ADD CONSTRAINT "ShootTypeRecommendation_shootTypeId_fkey" FOREIGN KEY ("shootTypeId") REFERENCES "ShootType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShootTypeRecommendation" ADD CONSTRAINT "ShootTypeRecommendation_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
