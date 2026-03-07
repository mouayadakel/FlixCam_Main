-- CreateEnum
CREATE TYPE "IdVerificationStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "idVerificationStatus" "IdVerificationStatus" NOT NULL DEFAULT 'NOT_SUBMITTED';
