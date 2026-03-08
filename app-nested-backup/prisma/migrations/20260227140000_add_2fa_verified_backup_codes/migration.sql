-- AlterTable
ALTER TABLE "User" ADD COLUMN "twoFactorVerifiedAt" TIMESTAMP(3),
ADD COLUMN "twoFactorBackupCodes" JSONB;
