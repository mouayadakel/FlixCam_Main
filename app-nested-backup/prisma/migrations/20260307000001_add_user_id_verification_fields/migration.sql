-- CreateEnum (if not exists - IdDocumentType may already exist from baseline)
DO $$ BEGIN
  CREATE TYPE "IdDocumentType" AS ENUM ('NATIONAL_ID', 'PASSPORT', 'DRIVING_LICENSE', 'IQAMA');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable User: add ID verification fields
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "idDocumentUrl" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "idDocumentType" "IdDocumentType";
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "idDocumentNumber" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "idVerifiedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "idVerifiedBy" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "idRejectionReason" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "skipIdVerification" BOOLEAN NOT NULL DEFAULT false;
