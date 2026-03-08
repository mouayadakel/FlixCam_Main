-- CreateTable (IF NOT EXISTS: baseline may already have created these)
CREATE TABLE IF NOT EXISTS "Branch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "address" TEXT,
    "city" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "workingHours" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DeliveryZone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "baseFee" DECIMAL(10,2) NOT NULL,
    "perKmFee" DECIMAL(10,2),
    "minOrder" DECIMAL(10,2),
    "leadTimeHrs" INTEGER NOT NULL DEFAULT 24,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "cities" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryZone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (ignore errors if already exist)
CREATE INDEX IF NOT EXISTS "Branch_isActive_idx" ON "Branch"("isActive");
CREATE INDEX IF NOT EXISTS "DeliveryZone_isActive_idx" ON "DeliveryZone"("isActive");
