-- AlterTable
ALTER TABLE "ImportJob" ADD COLUMN IF NOT EXISTS "columnMappingsBySheet" JSONB;

COMMENT ON COLUMN "ImportJob"."columnMappingsBySheet" IS 'User-confirmed column mappings per sheet (sheetName -> ColumnMapping[]); used by import worker so import respects UI mapping';
