-- CreateTable
CREATE TABLE "PaymentGatewayConfig" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "credentialsEnc" TEXT,
    "displayName" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "lastCheckedAt" TIMESTAMP(3),
    "lastCheckOk" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "PaymentGatewayConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentGatewayConfig_slug_key" ON "PaymentGatewayConfig"("slug");

-- CreateIndex
CREATE INDEX "PaymentGatewayConfig_slug_idx" ON "PaymentGatewayConfig"("slug");

-- CreateIndex
CREATE INDEX "PaymentGatewayConfig_deletedAt_idx" ON "PaymentGatewayConfig"("deletedAt");

-- CreateIndex
CREATE INDEX "PaymentGatewayConfig_enabled_sortOrder_idx" ON "PaymentGatewayConfig"("enabled", "sortOrder");
