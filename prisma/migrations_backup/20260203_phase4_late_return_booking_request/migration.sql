-- Phase 4.5: Late return tracking on Booking
-- Phase 4.3: BookingRequest (change/extension requests)

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "actualReturnDate" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "lateFeeAmount" DECIMAL(10,2);

-- CreateEnum
CREATE TYPE "BookingRequestType" AS ENUM ('CHANGE', 'EXTENSION');

-- CreateEnum
CREATE TYPE "BookingRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "BookingRequest" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "type" "BookingRequestType" NOT NULL,
    "status" "BookingRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "requestedEndDate" TIMESTAMP(3),
    "requestedChanges" JSONB,
    "responseNote" TEXT,
    "respondedAt" TIMESTAMP(3),
    "respondedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "BookingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingRequest_bookingId_idx" ON "BookingRequest"("bookingId");
CREATE INDEX "BookingRequest_requestedBy_idx" ON "BookingRequest"("requestedBy");
CREATE INDEX "BookingRequest_status_idx" ON "BookingRequest"("status");
CREATE INDEX "BookingRequest_type_idx" ON "BookingRequest"("type");
CREATE INDEX "BookingRequest_deletedAt_idx" ON "BookingRequest"("deletedAt");

-- AddForeignKey
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
