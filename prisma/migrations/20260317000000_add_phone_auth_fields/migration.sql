-- CreateEnum (idempotent: UserStatus may already exist from schema drift or earlier migration)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserStatus') THEN
    CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'LOCKED');
  END IF;
END
$$;

-- AlterTable: add phoneVerified to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneVerified" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: migrate User.status from TEXT to UserStatus enum
-- Step 1: Add new column
ALTER TABLE "User" ADD COLUMN "status_new" "UserStatus" NOT NULL DEFAULT 'PENDING';

-- Step 2: Backfill from existing status (TEXT)
UPDATE "User" SET "status_new" = CASE
  WHEN LOWER(TRIM("status")) = 'active' THEN 'ACTIVE'::"UserStatus"
  WHEN LOWER(TRIM("status")) = 'locked' THEN 'LOCKED'::"UserStatus"
  ELSE 'PENDING'::"UserStatus"
END;

-- Step 3: Drop old column and rename
ALTER TABLE "User" DROP COLUMN "status";
ALTER TABLE "User" RENAME COLUMN "status_new" TO "status";

-- CreateTable: PhoneVerification
CREATE TABLE "PhoneVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "otpCode" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhoneVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PhoneVerification_userId_idx" ON "PhoneVerification"("userId");
CREATE INDEX "PhoneVerification_expiresAt_idx" ON "PhoneVerification"("expiresAt");

-- AddForeignKey
ALTER TABLE "PhoneVerification" ADD CONSTRAINT "PhoneVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Recreate index that was dropped with old status column
CREATE INDEX "User_status_idx" ON "User"("status");
