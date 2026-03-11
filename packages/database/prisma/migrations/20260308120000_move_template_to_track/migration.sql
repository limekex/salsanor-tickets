-- Add templateType and deliveryMethod to CourseTrack
-- This allows different course types within the same period

-- Add columns with defaults
ALTER TABLE "CourseTrack" ADD COLUMN "templateType" "CourseTemplateType" NOT NULL DEFAULT 'INDIVIDUAL';
ALTER TABLE "CourseTrack" ADD COLUMN "deliveryMethod" "DeliveryMethod" NOT NULL DEFAULT 'IN_PERSON';

-- Copy values from parent CoursePeriod to each track
UPDATE "CourseTrack" ct
SET 
  "templateType" = cp."templateType",
  "deliveryMethod" = cp."deliveryMethod"
FROM "CoursePeriod" cp
WHERE ct."periodId" = cp.id;
