-- CreateEnum
CREATE TYPE "RecurrenceFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "recurringSeriesId" TEXT;

-- CreateTable
CREATE TABLE "RecurringSeries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "frequency" "RecurrenceFrequency" NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "endDate" TIMESTAMP(3),
    "occurrenceCount" INTEGER,
    "template" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "RecurringSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "discountPercent" DECIMAL(5,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "Kit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KitEquipment" (
    "id" TEXT NOT NULL,
    "kitId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KitEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Kit_slug_key" ON "Kit"("slug");

-- CreateIndex
CREATE INDEX "Kit_slug_idx" ON "Kit"("slug");

-- CreateIndex
CREATE INDEX "Kit_isActive_idx" ON "Kit"("isActive");

-- CreateIndex
CREATE INDEX "Kit_deletedAt_idx" ON "Kit"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "KitEquipment_kitId_equipmentId_key" ON "KitEquipment"("kitId", "equipmentId");

-- CreateIndex
CREATE INDEX "KitEquipment_kitId_idx" ON "KitEquipment"("kitId");

-- CreateIndex
CREATE INDEX "KitEquipment_equipmentId_idx" ON "KitEquipment"("equipmentId");

-- CreateIndex
CREATE INDEX "RecurringSeries_customerId_idx" ON "RecurringSeries"("customerId");

-- CreateIndex
CREATE INDEX "RecurringSeries_isActive_idx" ON "RecurringSeries"("isActive");

-- CreateIndex
CREATE INDEX "RecurringSeries_deletedAt_idx" ON "RecurringSeries"("deletedAt");

-- CreateIndex
CREATE INDEX "Booking_recurringSeriesId_idx" ON "Booking"("recurringSeriesId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_recurringSeriesId_fkey" FOREIGN KEY ("recurringSeriesId") REFERENCES "RecurringSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringSeries" ADD CONSTRAINT "RecurringSeries_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitEquipment" ADD CONSTRAINT "KitEquipment_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "Kit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitEquipment" ADD CONSTRAINT "KitEquipment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
