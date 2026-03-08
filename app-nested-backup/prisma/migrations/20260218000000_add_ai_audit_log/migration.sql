-- CreateTable
CREATE TABLE "AiAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiAuditLog_userId_idx" ON "AiAuditLog"("userId");

-- CreateIndex
CREATE INDEX "AiAuditLog_action_idx" ON "AiAuditLog"("action");

-- CreateIndex
CREATE INDEX "AiAuditLog_createdAt_idx" ON "AiAuditLog"("createdAt");
