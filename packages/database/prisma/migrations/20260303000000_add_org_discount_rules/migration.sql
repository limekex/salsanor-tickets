-- Migration: add_org_discount_rules
-- This migration was applied directly to the database but the file was
-- not committed to the repository at the time.
--
-- NON-DESTRUCTIVE RECOVERY:
-- Both staging and local databases already have this migration recorded in
-- _prisma_migrations. After this file is present in the local migrations
-- directory you must run the following command once against EACH database
-- (local and staging) to reconcile the checksum so `prisma migrate dev`
-- no longer reports divergence:
--
--   npx prisma migrate resolve --applied "20260303000000_add_org_discount_rules"
--
-- This command does NOT run any SQL – it only updates the checksum in the
-- _prisma_migrations table to match this file, resolving the divergence
-- without touching any data.
--
-- If your local database does NOT yet have this migration recorded at all,
-- use the same command to mark it as already applied and skip re-running it.

-- Make periodId nullable so DiscountRules can be scoped to an organizer
-- instead of (or in addition to) a specific CoursePeriod.
ALTER TABLE "DiscountRule"
  ALTER COLUMN "periodId" DROP NOT NULL;

-- Add organizerId for organizer-level discount rules (period-independent).
ALTER TABLE "DiscountRule"
  ADD COLUMN IF NOT EXISTS "organizerId" TEXT;

-- Add a foreign key for the new organizerId column.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'DiscountRule_organizerId_fkey'
  ) THEN
    ALTER TABLE "DiscountRule"
      ADD CONSTRAINT "DiscountRule_organizerId_fkey"
        FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Index to look up rules by organizer efficiently.
CREATE INDEX IF NOT EXISTS "DiscountRule_organizerId_idx"
  ON "DiscountRule"("organizerId");
