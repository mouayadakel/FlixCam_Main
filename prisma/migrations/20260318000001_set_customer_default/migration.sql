-- AlterTable: Set CUSTOMER as default for new users (after enum value is committed)
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER';
