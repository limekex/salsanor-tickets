-- Add bookedWeeks array to Registration for per-week slot booking
ALTER TABLE "Registration" ADD COLUMN "bookedWeeks" INTEGER[] NOT NULL DEFAULT '{}';

-- Add weekIndex to SlotHold for per-week holds
ALTER TABLE "SlotHold" ADD COLUMN "weekIndex" INTEGER;

-- Drop old unique constraint and create new one that includes weekIndex
DROP INDEX IF EXISTS "SlotHold_trackId_slotIndex_sessionKey_key";
CREATE UNIQUE INDEX "SlotHold_trackId_slotIndex_weekIndex_sessionKey_key" ON "SlotHold"("trackId", "slotIndex", "weekIndex", "sessionKey");
