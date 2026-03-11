-- Add slot booking fields for PRIVATE template
-- These fields enable time-slot based booking for 1-on-1 private lessons

ALTER TABLE "CourseTrack" ADD COLUMN "slotStartTime" TEXT;
ALTER TABLE "CourseTrack" ADD COLUMN "slotDurationMinutes" INTEGER;
ALTER TABLE "CourseTrack" ADD COLUMN "slotBreakMinutes" INTEGER;
ALTER TABLE "CourseTrack" ADD COLUMN "slotCount" INTEGER;
ALTER TABLE "CourseTrack" ADD COLUMN "pricePerSlotCents" INTEGER;
ALTER TABLE "CourseTrack" ADD COLUMN "maxContinuousSlots" INTEGER;
