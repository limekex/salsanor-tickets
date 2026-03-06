-- Add geofencing fields to CourseTrack for dashboard check-in location verification
ALTER TABLE "CourseTrack" ADD COLUMN "geofenceEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CourseTrack" ADD COLUMN "geofenceRadius" INTEGER;
