-- CreateEnum
CREATE TYPE "CourseTemplateType" AS ENUM ('CUSTOM', 'INDIVIDUAL', 'PARTNER', 'VIRTUAL', 'WORKSHOP', 'DROP_IN', 'KIDS_YOUTH', 'TEAM', 'SUBSCRIPTION', 'PRIVATE');

-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('IN_PERSON', 'VIRTUAL', 'HYBRID');

-- AlterTable: Add template fields to CoursePeriod
ALTER TABLE "CoursePeriod" ADD COLUMN "templateType" "CourseTemplateType" NOT NULL DEFAULT 'INDIVIDUAL';
ALTER TABLE "CoursePeriod" ADD COLUMN "deliveryMethod" "DeliveryMethod" NOT NULL DEFAULT 'IN_PERSON';
ALTER TABLE "CoursePeriod" ADD COLUMN "customFields" JSONB;

-- AlterTable: Add custom field values to Registration
ALTER TABLE "Registration" ADD COLUMN "customFieldValues" JSONB;
