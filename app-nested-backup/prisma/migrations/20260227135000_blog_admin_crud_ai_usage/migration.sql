-- AlterTable BlogCategory: add parentCategoryId, coverImage, metaTitle, metaDescription
ALTER TABLE "BlogCategory" ADD COLUMN "coverImage" TEXT;
ALTER TABLE "BlogCategory" ADD COLUMN "metaTitle" TEXT;
ALTER TABLE "BlogCategory" ADD COLUMN "metaDescription" TEXT;
ALTER TABLE "BlogCategory" ADD COLUMN "parentCategoryId" TEXT;

-- CreateIndex
CREATE INDEX "BlogCategory_parentCategoryId_idx" ON "BlogCategory"("parentCategoryId");

-- AddForeignKey (self-relation for parent)
ALTER TABLE "BlogCategory" ADD CONSTRAINT "BlogCategory_parentCategoryId_fkey" FOREIGN KEY ("parentCategoryId") REFERENCES "BlogCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable BlogAuthor: add slug, email, githubUrl, websiteUrl, metaTitle, metaDescription, isActive
ALTER TABLE "BlogAuthor" ADD COLUMN "slug" TEXT;
ALTER TABLE "BlogAuthor" ADD COLUMN "email" TEXT;
ALTER TABLE "BlogAuthor" ADD COLUMN "githubUrl" TEXT;
ALTER TABLE "BlogAuthor" ADD COLUMN "websiteUrl" TEXT;
ALTER TABLE "BlogAuthor" ADD COLUMN "metaTitle" TEXT;
ALTER TABLE "BlogAuthor" ADD COLUMN "metaDescription" TEXT;
ALTER TABLE "BlogAuthor" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Backfill slug for existing authors (author-{id} for guaranteed uniqueness)
UPDATE "BlogAuthor" SET "slug" = 'author-' || "id" WHERE "slug" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "BlogAuthor_slug_key" ON "BlogAuthor"("slug");
CREATE UNIQUE INDEX "BlogAuthor_email_key" ON "BlogAuthor"("email");
CREATE INDEX "BlogAuthor_slug_idx" ON "BlogAuthor"("slug");
CREATE INDEX "BlogAuthor_email_idx" ON "BlogAuthor"("email");
CREATE INDEX "BlogAuthor_isActive_idx" ON "BlogAuthor"("isActive");

-- CreateTable BlogAiUsageLog
CREATE TABLE "BlogAiUsageLog" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "userId" TEXT,
    "ip" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlogAiUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BlogAiUsageLog_userId_idx" ON "BlogAiUsageLog"("userId");
CREATE INDEX "BlogAiUsageLog_endpoint_idx" ON "BlogAiUsageLog"("endpoint");
CREATE INDEX "BlogAiUsageLog_createdAt_idx" ON "BlogAiUsageLog"("createdAt");
