-- Migration: add_discount_scope
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
--   npx prisma migrate resolve --applied "20260303100000_add_discount_scope"
--
-- This command does NOT run any SQL – it only updates the checksum in the
-- _prisma_migrations table to match this file, resolving the divergence
-- without touching any data.
--
-- If your local database does NOT yet have this migration recorded at all,
-- use the same command to mark it as already applied and skip re-running it.

-- Add discountScope to distinguish period-level vs organizer-level rules.
ALTER TABLE "DiscountRule"
  ADD COLUMN IF NOT EXISTS "discountScope" TEXT NOT NULL DEFAULT 'PERIOD';

-- Index for efficient scope-based queries.
CREATE INDEX IF NOT EXISTS "DiscountRule_discountScope_idx"
  ON "DiscountRule"("discountScope");
