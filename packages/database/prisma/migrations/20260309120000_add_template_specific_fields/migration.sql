-- Add template-specific fields to CourseTrack
-- These fields support different course templates (VIRTUAL, KIDS_YOUTH, TEAM)

-- Virtual meeting fields (for VIRTUAL template and VIRTUAL/HYBRID delivery methods)
ALTER TABLE "CourseTrack" ADD COLUMN "meetingUrl" TEXT;
ALTER TABLE "CourseTrack" ADD COLUMN "meetingPassword" TEXT;

-- Age restriction fields (for KIDS_YOUTH template)
ALTER TABLE "CourseTrack" ADD COLUMN "minAge" INTEGER;
ALTER TABLE "CourseTrack" ADD COLUMN "maxAge" INTEGER;

-- Team configuration fields (for TEAM template)
ALTER TABLE "CourseTrack" ADD COLUMN "teamMinSize" INTEGER;
ALTER TABLE "CourseTrack" ADD COLUMN "teamMaxSize" INTEGER;

-- Custom role labels (for PARTNER/role-based templates)
-- Allows organizers to customize "Leader"/"Follower" to domain-specific terms
ALTER TABLE "CourseTrack" ADD COLUMN "roleALabel" TEXT;
ALTER TABLE "CourseTrack" ADD COLUMN "roleBLabel" TEXT;
