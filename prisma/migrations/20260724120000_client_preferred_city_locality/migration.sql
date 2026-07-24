-- AlterTable
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "preferredCity" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "preferredLocality" TEXT;
