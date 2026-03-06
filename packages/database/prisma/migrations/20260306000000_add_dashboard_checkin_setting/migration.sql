-- Add allowDashboardCheckIn to CourseTrack
-- This controls whether participants can check in from their /my dashboard
ALTER TABLE "CourseTrack" ADD COLUMN "allowDashboardCheckIn" BOOLEAN NOT NULL DEFAULT false;
