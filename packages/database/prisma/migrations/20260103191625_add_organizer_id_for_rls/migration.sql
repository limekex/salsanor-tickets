/*
  Add organizerId to Order and AuditLog for RLS support
  
  This migration:
  1. Adds organizerId columns
  2. Backfills from existing relations
  3. Makes Order.organizerId required
  4. Adds indexes and foreign keys
*/

-- Step 1: Add organizerId columns as nullable
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "organizerId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "organizerId" TEXT;

-- Step 2: Backfill Order.organizerId
-- Primary: From CoursePeriod via periodId
UPDATE "Order" o
SET "organizerId" = cp."organizerId"
FROM "CoursePeriod" cp
WHERE o."periodId" = cp.id 
  AND o."organizerId" IS NULL;

-- Fallback 1: From Event via EventRegistration (for EVENT orders)
UPDATE "Order" o
SET "organizerId" = e."organizerId"
FROM "EventRegistration" er
JOIN "Event" e ON er."eventId" = e.id
WHERE er."orderId" = o.id
  AND o."organizerId" IS NULL;

-- Fallback 2: From Membership (for MEMBERSHIP orders)
UPDATE "Order" o
SET "organizerId" = m."organizerId"
FROM "Membership" m
WHERE m."orderId" = o.id
  AND o."organizerId" IS NULL;

-- Fallback 3: From Registration via periodId (if any orders still null)
UPDATE "Order" o
SET "organizerId" = cp."organizerId"
FROM "Registration" r
JOIN "CoursePeriod" cp ON r."periodId" = cp.id
WHERE r."orderId" = o.id
  AND o."organizerId" IS NULL;

-- Step 3: Make organizerId NOT NULL
ALTER TABLE "Order" ALTER COLUMN "organizerId" SET NOT NULL;

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS "AuditLog_organizerId_timestamp_idx" 
  ON "AuditLog"("organizerId", "timestamp");

CREATE INDEX IF NOT EXISTS "Order_organizerId_status_idx" 
  ON "Order"("organizerId", "status");

-- Step 5: Add foreign keys
ALTER TABLE "Order" 
  ADD CONSTRAINT "Order_organizerId_fkey" 
  FOREIGN KEY ("organizerId") 
  REFERENCES "Organizer"("id") 
  ON DELETE RESTRICT 
  ON UPDATE CASCADE;

ALTER TABLE "AuditLog" 
  ADD CONSTRAINT "AuditLog_organizerId_fkey" 
  FOREIGN KEY ("organizerId") 
  REFERENCES "Organizer"("id") 
  ON DELETE SET NULL 
  ON UPDATE CASCADE;
