-- Import: skip duplicate barcodes without overwriting existing products
ALTER TYPE "ImportRowStatus" ADD VALUE 'SKIPPED';

ALTER TABLE "ImportJob" ADD COLUMN "skippedRows" INTEGER NOT NULL DEFAULT 0;
