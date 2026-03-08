-- Add CartItem -> Equipment FK
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add CartItem -> Kit FK
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "Kit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add CartItem kitId index
CREATE INDEX "CartItem_kitId_idx" ON "CartItem"("kitId");

-- Add Booking -> Cart link
ALTER TABLE "Booking" ADD COLUMN "cartId" TEXT;

-- Add Quote -> Cart link
ALTER TABLE "Quote" ADD COLUMN "cartId" TEXT;

-- Add unique constraints for cartId (one booking/quote per cart)
CREATE UNIQUE INDEX "Booking_cartId_key" ON "Booking"("cartId");
CREATE UNIQUE INDEX "Quote_cartId_key" ON "Quote"("cartId");

-- Add Booking -> Cart FK
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add Quote -> Cart FK
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add indexes for cartId
CREATE INDEX "Booking_cartId_idx" ON "Booking"("cartId");
CREATE INDEX "Quote_cartId_idx" ON "Quote"("cartId");
