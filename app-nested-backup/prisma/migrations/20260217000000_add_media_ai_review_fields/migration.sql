-- AlterTable: Add AI image review fields to Media (Phase 5b + Phase A hardening)
ALTER TABLE "Media" ADD COLUMN "pendingReview" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Media" ADD COLUMN "imageSource" TEXT;
ALTER TABLE "Media" ADD COLUMN "qualityScore" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "Media_pendingReview_idx" ON "Media"("pendingReview");
