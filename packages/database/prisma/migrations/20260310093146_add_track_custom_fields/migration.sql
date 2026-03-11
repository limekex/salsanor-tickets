-- AlterTable
ALTER TABLE "CourseTrack" ADD COLUMN     "customFields" JSONB;

-- AlterTable
ALTER TABLE "Registration" ALTER COLUMN "bookedSlots" DROP DEFAULT,
ALTER COLUMN "bookedWeeks" DROP DEFAULT;
