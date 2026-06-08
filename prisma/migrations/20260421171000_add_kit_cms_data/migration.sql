-- Align database with Prisma: Kit.cmsData (package CMS JSON for public/admin UI)
ALTER TABLE "Kit" ADD COLUMN IF NOT EXISTS "cmsData" JSONB;
