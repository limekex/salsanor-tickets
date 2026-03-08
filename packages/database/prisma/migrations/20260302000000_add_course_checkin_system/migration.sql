-- CreateEnum
CREATE TYPE "CheckInMethod" AS ENUM ('QR_SCAN', 'MANUAL', 'BULK_IMPORT', 'SELF_CHECKIN');

-- AlterTable: Add check-in window fields to CourseTrack
ALTER TABLE "CourseTrack" ADD COLUMN "checkInWindowBefore" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "CourseTrack" ADD COLUMN "checkInWindowAfter" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "CourseTrack" ADD COLUMN "allowSelfCheckIn" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: Attendance
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "sessionDate" TIMESTAMP(3) NOT NULL,
    "checkInTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedInBy" TEXT NOT NULL,
    "method" "CheckInMethod" NOT NULL DEFAULT 'MANUAL',
    "deviceInfo" TEXT,
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Attendance_trackId_sessionDate_idx" ON "Attendance"("trackId", "sessionDate");

-- CreateIndex
CREATE INDEX "Attendance_periodId_sessionDate_idx" ON "Attendance"("periodId", "sessionDate");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "Attendance_registrationId_trackId_sessionDate_key" ON "Attendance"("registrationId", "trackId", "sessionDate");

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "CourseTrack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "CoursePeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_checkedInBy_fkey" FOREIGN KEY ("checkedInBy") REFERENCES "UserAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
