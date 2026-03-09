-- Add bookedSlots field to Registration for confirmed slot bookings
ALTER TABLE "Registration" ADD COLUMN "bookedSlots" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- Create SlotHold table for temporary slot reservations during checkout
CREATE TABLE "SlotHold" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "slotIndex" INTEGER NOT NULL,
    "sessionKey" TEXT NOT NULL,
    "personId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "SlotHold_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: one session can only hold a specific slot once
CREATE UNIQUE INDEX "SlotHold_trackId_slotIndex_sessionKey_key" ON "SlotHold"("trackId", "slotIndex", "sessionKey");

-- Index for efficient cleanup queries
CREATE INDEX "SlotHold_trackId_expiresAt_idx" ON "SlotHold"("trackId", "expiresAt");

-- Index for session lookups
CREATE INDEX "SlotHold_sessionKey_idx" ON "SlotHold"("sessionKey");

-- Foreign key to CourseTrack (cascade delete when track is deleted)
ALTER TABLE "SlotHold" ADD CONSTRAINT "SlotHold_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "CourseTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign key to PersonProfile (cascade delete when person is deleted)
ALTER TABLE "SlotHold" ADD CONSTRAINT "SlotHold_personId_fkey" FOREIGN KEY ("personId") REFERENCES "PersonProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
