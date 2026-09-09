-- Add optional state (filled from India Post pincode lookup)

ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "state" TEXT;
