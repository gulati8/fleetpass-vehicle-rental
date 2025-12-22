-- Add organization ownership to customer records
ALTER TABLE "Customer" ADD COLUMN "organizationId" TEXT NOT NULL;
ALTER TABLE "Customer" DROP CONSTRAINT "Customer_email_key";
CREATE UNIQUE INDEX "Customer_organizationId_email_key" ON "Customer"("organizationId", "email");
CREATE INDEX "Customer_organizationId_idx" ON "Customer"("organizationId");
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add organization ownership to bookings
ALTER TABLE "Booking" ADD COLUMN "organizationId" TEXT NOT NULL;
CREATE INDEX "Booking_organizationId_idx" ON "Booking"("organizationId");
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add organization ownership to leads
ALTER TABLE "Lead" ADD COLUMN "organizationId" TEXT NOT NULL;
CREATE INDEX "Lead_organizationId_idx" ON "Lead"("organizationId");
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add organization ownership to deals
ALTER TABLE "Deal" ADD COLUMN "organizationId" TEXT NOT NULL;
CREATE INDEX "Deal_organizationId_idx" ON "Deal"("organizationId");
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
