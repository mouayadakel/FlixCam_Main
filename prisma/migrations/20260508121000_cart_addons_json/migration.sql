-- Add persisted checkout add-ons to Cart so pricing can be locked + charged server-side.
ALTER TABLE "Cart"
ADD COLUMN IF NOT EXISTS "addons" JSONB;

