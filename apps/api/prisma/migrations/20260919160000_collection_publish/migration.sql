-- AlterEnum
ALTER TYPE "CampaignSeason" ADD VALUE 'SPRING';

-- AlterTable
ALTER TABLE "Collection" ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Collection" ADD COLUMN "inNav" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Collection" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Collection" ADD COLUMN "bannerPath" TEXT;

UPDATE "Collection" SET "published" = true, "sortOrder" = 0, "bannerPath" = '/brand/hero-editorial.jpg' WHERE "slug" = 'winter';
UPDATE "Collection" SET "inNav" = true, "sortOrder" = 1, "bannerPath" = '/brand/hero-editorial.jpg' WHERE "slug" = 'ramadan';
UPDATE "Collection" SET "inNav" = true, "sortOrder" = 2, "bannerPath" = '/brand/banner-eid.jpg' WHERE "slug" = 'eid';
