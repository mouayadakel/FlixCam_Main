/*
  Warnings:

  - You are about to alter the column `name` on the `AutomationRule` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(120)`.
  - You are about to alter the column `name` on the `BusinessRecipient` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(120)`.
  - You are about to alter the column `phone` on the `BusinessRecipient` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `email` on the `BusinessRecipient` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `whatsappNumber` on the `BusinessRecipient` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.

*/
-- CreateEnum (idempotent: skip if already exists from partial apply)
DO $$ BEGIN
  CREATE TYPE "DigestFrequency" AS ENUM ('HOURLY', 'DAILY', 'WEEKLY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


DO $$
DECLARE
  r text;
  roles text[] := ARRAY['CO_OWNER','GENERAL_MANAGER','OPERATIONS_MANAGER','INVENTORY_MANAGER','CUSTOMER_SUPPORT','TECHNICAL_SUPPORT','ACCOUNTANT','SALES_MANAGER','MARKETING_MANAGER','LEGAL','IT_ADMIN','CUSTOM'];
BEGIN
  FOREACH r IN ARRAY roles
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'BusinessRecipientRole' AND e.enumlabel = r) THEN
      EXECUTE format('ALTER TYPE "BusinessRecipientRole" ADD VALUE %L', r);
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'RecipientType' AND e.enumlabel = 'ALL') THEN
    ALTER TYPE "RecipientType" ADD VALUE 'ALL';
  END IF;
END $$;

-- AlterTable
ALTER TABLE "AutomationRule" ADD COLUMN     "allowDuplicates" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "failedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "frequencyCap" JSONB,
ADD COLUMN     "lastTriggered" TIMESTAMP(3),
ADD COLUMN     "maxRetries" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "respectDND" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "retryDelay" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "sentCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "specificRecipients" JSONB,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Asia/Riyadh',
ADD COLUMN     "triggerDelay" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedBy" TEXT,
ALTER COLUMN "name" SET DATA TYPE VARCHAR(120),
ALTER COLUMN "conditions" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "BusinessRecipient" ADD COLUMN     "alternateEmail" VARCHAR(255),
ADD COLUMN     "alternatePhone" VARCHAR(20),
ADD COLUMN     "arabicName" VARCHAR(120),
ADD COLUMN     "backupFor" TEXT,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "department" VARCHAR(100),
ADD COLUMN     "digestEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "digestFrequency" "DigestFrequency",
ADD COLUMN     "digestTime" TEXT,
ADD COLUMN     "dndDays" JSONB DEFAULT '[]',
ADD COLUMN     "dndEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dndEnd" TEXT,
ADD COLUMN     "dndStart" TEXT,
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "englishName" VARCHAR(120),
ADD COLUMN     "excludeTriggers" JSONB DEFAULT '[]',
ADD COLUMN     "isBackup" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPrimary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "jobTitle" VARCHAR(100),
ADD COLUMN     "lastReceived" TIMESTAMP(3),
ADD COLUMN     "messagesReceived" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preferredChannel" "NotificationChannel",
ADD COLUMN     "preferredLanguage" TEXT NOT NULL DEFAULT 'ar',
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "receiveDamage" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "receiveLate" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "receiveUrgent" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Asia/Riyadh',
ADD COLUMN     "updatedBy" TEXT,
ADD COLUMN     "whatsappBusiness" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsappVerified" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "name" SET DATA TYPE VARCHAR(120),
ALTER COLUMN "phone" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "email" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "whatsappNumber" SET DATA TYPE VARCHAR(20);

-- CreateIndex
CREATE INDEX "AutomationRule_recipientType_idx" ON "AutomationRule"("recipientType");

-- CreateIndex
CREATE INDEX "BusinessRecipient_isPrimary_isActive_idx" ON "BusinessRecipient"("isPrimary", "isActive");
