-- AlterTable
ALTER TABLE "PromissoryNote" ADD COLUMN IF NOT EXISTS "letterContent" TEXT;
ALTER TABLE "PromissoryNote" ADD COLUMN IF NOT EXISTS "letterPdfUrl" TEXT;
ALTER TABLE "PromissoryNote" ADD COLUMN IF NOT EXISTS "letterType" TEXT;
