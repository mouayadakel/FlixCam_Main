-- CreateTable
CREATE TABLE "CheckoutFormSection" (
    "id" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "step" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CheckoutFormSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckoutFormField" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "labelAr" TEXT NOT NULL,
    "placeholderEn" TEXT,
    "placeholderAr" TEXT,
    "fieldType" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "options" JSONB,
    "conditionFieldKey" TEXT,
    "conditionValue" TEXT,
    "defaultValue" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckoutFormField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receiver" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "idNumber" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "idPhotoUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Receiver_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "receiverId" TEXT,
ADD COLUMN "receiverName" TEXT,
ADD COLUMN "receiverPhone" TEXT,
ADD COLUMN "receiverIdNumber" TEXT,
ADD COLUMN "receiverIdPhotoUrl" TEXT,
ADD COLUMN "fulfillmentMethod" TEXT,
ADD COLUMN "deliveryAddress" TEXT,
ADD COLUMN "deliveryLat" DOUBLE PRECISION,
ADD COLUMN "deliveryLng" DOUBLE PRECISION,
ADD COLUMN "preferredTimeSlot" TEXT,
ADD COLUMN "emergencyContactName" TEXT,
ADD COLUMN "emergencyContactPhone" TEXT,
ADD COLUMN "emergencyContactRelation" TEXT,
ADD COLUMN "checkoutFormData" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutFormField_fieldKey_key" ON "CheckoutFormField"("fieldKey");

-- CreateIndex
CREATE INDEX "CheckoutFormSection_step_sortOrder_idx" ON "CheckoutFormSection"("step", "sortOrder");

-- CreateIndex
CREATE INDEX "CheckoutFormSection_deletedAt_idx" ON "CheckoutFormSection"("deletedAt");

-- CreateIndex
CREATE INDEX "CheckoutFormField_sectionId_sortOrder_idx" ON "CheckoutFormField"("sectionId", "sortOrder");

-- CreateIndex
CREATE INDEX "Receiver_userId_idx" ON "Receiver"("userId");

-- CreateIndex
CREATE INDEX "Receiver_deletedAt_idx" ON "Receiver"("deletedAt");

-- AddForeignKey
ALTER TABLE "CheckoutFormField" ADD CONSTRAINT "CheckoutFormField_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "CheckoutFormSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receiver" ADD CONSTRAINT "Receiver_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
