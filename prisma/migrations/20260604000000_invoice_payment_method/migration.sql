-- FIX-061: payment method on invoice (from successful gateway payment)
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;
