-- Add organization ownership to customer records
-- First check if organizationId column already exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Customer' AND column_name = 'organizationId') THEN
    -- Get the first organization ID to use as default
    DECLARE
      first_org_id TEXT;
    BEGIN
      SELECT id INTO first_org_id FROM "Organization" LIMIT 1;

      -- Add column with default value
      EXECUTE format('ALTER TABLE "Customer" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT %L', first_org_id);

      -- Remove the default after populating
      ALTER TABLE "Customer" ALTER COLUMN "organizationId" DROP DEFAULT;
    END;
  END IF;
END $$;

-- Drop old unique constraint if it exists
DO $$ BEGIN
  ALTER TABLE "Customer" DROP CONSTRAINT IF EXISTS "Customer_email_key";
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create new composite unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "Customer_organizationId_email_key" ON "Customer"("organizationId", "email");

-- Create organization index
CREATE INDEX IF NOT EXISTS "Customer_organizationId_idx" ON "Customer"("organizationId");

-- Add foreign key if it doesn't exist
DO $$ BEGIN
  ALTER TABLE "Customer" ADD CONSTRAINT "Customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add organization ownership to bookings
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Booking' AND column_name = 'organizationId') THEN
    DECLARE
      first_org_id TEXT;
    BEGIN
      SELECT id INTO first_org_id FROM "Organization" LIMIT 1;
      EXECUTE format('ALTER TABLE "Booking" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT %L', first_org_id);
      ALTER TABLE "Booking" ALTER COLUMN "organizationId" DROP DEFAULT;
    END;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Booking_organizationId_idx" ON "Booking"("organizationId");

DO $$ BEGIN
  ALTER TABLE "Booking" ADD CONSTRAINT "Booking_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add organization ownership to leads
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Lead' AND column_name = 'organizationId') THEN
    DECLARE
      first_org_id TEXT;
    BEGIN
      SELECT id INTO first_org_id FROM "Organization" LIMIT 1;
      EXECUTE format('ALTER TABLE "Lead" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT %L', first_org_id);
      ALTER TABLE "Lead" ALTER COLUMN "organizationId" DROP DEFAULT;
    END;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Lead_organizationId_idx" ON "Lead"("organizationId");

DO $$ BEGIN
  ALTER TABLE "Lead" ADD CONSTRAINT "Lead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add organization ownership to deals
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Deal' AND column_name = 'organizationId') THEN
    DECLARE
      first_org_id TEXT;
    BEGIN
      SELECT id INTO first_org_id FROM "Organization" LIMIT 1;
      EXECUTE format('ALTER TABLE "Deal" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT %L', first_org_id);
      ALTER TABLE "Deal" ALTER COLUMN "organizationId" DROP DEFAULT;
    END;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Deal_organizationId_idx" ON "Deal"("organizationId");

DO $$ BEGIN
  ALTER TABLE "Deal" ADD CONSTRAINT "Deal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
