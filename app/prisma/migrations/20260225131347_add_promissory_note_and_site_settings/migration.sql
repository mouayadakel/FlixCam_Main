-- CreateTable
CREATE TABLE "PromissoryNote" (
    "id" TEXT NOT NULL,
    "noteNumber" TEXT NOT NULL,
    "noteType" TEXT NOT NULL,
    "debtorId" TEXT NOT NULL,
    "debtorName" TEXT NOT NULL,
    "debtorNationalId" TEXT,
    "debtorNationality" TEXT,
    "debtorDob" TIMESTAMP(3),
    "debtorAddress" TEXT,
    "debtorPhone" TEXT NOT NULL,
    "debtorEmail" TEXT NOT NULL,
    "creditorName" TEXT NOT NULL,
    "creditorCommercialReg" TEXT,
    "creditorTaxNumber" TEXT,
    "creditorAddress" TEXT,
    "creditorBankAccount" TEXT,
    "creditorIban" TEXT,
    "amountSar" DECIMAL(12,2) NOT NULL,
    "amountInWords" TEXT NOT NULL,
    "equipmentPurchaseValue" DECIMAL(12,2),
    "equipmentItems" JSONB,
    "bookingId" TEXT,
    "invoiceNumber" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedReturnDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "termsAccepted" BOOLEAN NOT NULL DEFAULT false,
    "damagePolicyAccepted" BOOLEAN NOT NULL DEFAULT false,
    "lateFeesAccepted" BOOLEAN NOT NULL DEFAULT false,
    "signatureData" TEXT,
    "signatureTimestamp" TIMESTAMP(3),
    "signatureIp" TEXT,
    "signatureDevice" TEXT,
    "pdfGenerated" BOOLEAN NOT NULL DEFAULT false,
    "pdfUrl" TEXT,
    "pdfGeneratedAt" TIMESTAMP(3),
    "managerLetterTemplate" TEXT,
    "managerName" TEXT,
    "managerTitle" TEXT,
    "enforcedAt" TIMESTAMP(3),
    "enforcedReason" TEXT,
    "fulfilledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "signedAt" TIMESTAMP(3),

    CONSTRAINT "PromissoryNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PromissoryNote_noteNumber_key" ON "PromissoryNote"("noteNumber");

-- CreateIndex
CREATE INDEX "PromissoryNote_noteNumber_idx" ON "PromissoryNote"("noteNumber");

-- CreateIndex
CREATE INDEX "PromissoryNote_debtorId_idx" ON "PromissoryNote"("debtorId");

-- CreateIndex
CREATE INDEX "PromissoryNote_bookingId_idx" ON "PromissoryNote"("bookingId");

-- CreateIndex
CREATE INDEX "PromissoryNote_status_idx" ON "PromissoryNote"("status");

-- CreateIndex
CREATE INDEX "PromissoryNote_noteType_idx" ON "PromissoryNote"("noteType");

-- CreateIndex
CREATE UNIQUE INDEX "SiteSetting_key_key" ON "SiteSetting"("key");

-- CreateIndex
CREATE INDEX "SiteSetting_key_idx" ON "SiteSetting"("key");

-- AddForeignKey
ALTER TABLE "PromissoryNote" ADD CONSTRAINT "PromissoryNote_debtorId_fkey" FOREIGN KEY ("debtorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromissoryNote" ADD CONSTRAINT "PromissoryNote_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
