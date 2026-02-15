-- DropIndex
DROP INDEX "ShootTypeRecommendation_shootTypeId_equipmentId_key";

-- CreateIndex
CREATE UNIQUE INDEX "ShootTypeRecommendation_shootTypeId_equipmentId_budgetTier_key" ON "ShootTypeRecommendation"("shootTypeId", "equipmentId", "budgetTier");

-- CreateIndex
CREATE INDEX "ShootTypeRecommendation_shootTypeId_budgetTier_idx" ON "ShootTypeRecommendation"("shootTypeId", "budgetTier");
