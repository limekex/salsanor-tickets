-- CreateEnum
CREATE TYPE "AbsenceReason" AS ENUM ('ILLNESS', 'TRAVEL', 'WORK', 'FAMILY', 'PERSONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "DiscountScope" AS ENUM ('PERIODS', 'EVENTS', 'BOTH');

-- CreateEnum
CREATE TYPE "ScheduledTaskType" AS ENUM ('SESSION_REMINDER', 'BREAK_REMINDER', 'MISSED_SESSION_NOTIFY', 'LOW_ATTENDANCE_WARN', 'MEMBERSHIP_EXPIRY_WARN', 'WAITLIST_CLEANUP', 'REPORT_GENERATION');

-- CreateEnum
CREATE TYPE "TaskRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED');

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_entityId_fkey";

-- AlterTable
ALTER TABLE "CourseTrack" ADD COLUMN     "description" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "locationAddress" TEXT,
ADD COLUMN     "locationName" TEXT,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "slug" TEXT;

-- AlterTable
ALTER TABLE "CreditNote" ADD COLUMN     "acquirerReferenceNumber" TEXT;

-- AlterTable
ALTER TABLE "DiscountRule" ADD COLUMN     "overrideOrgRules" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "MembershipTier" ADD COLUMN     "accentColor" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "netAmountCents" INTEGER,
ADD COLUMN     "platformFeeCents" INTEGER,
ADD COLUMN     "stripeBalanceTransactionId" TEXT,
ADD COLUMN     "stripeCardBrand" TEXT,
ADD COLUMN     "stripeCardFingerprint" TEXT,
ADD COLUMN     "stripeCardLast4" TEXT,
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeFeeCents" INTEGER,
ADD COLUMN     "stripePaymentIntentId" TEXT,
ADD COLUMN     "stripePaymentMethodId" TEXT,
ADD COLUMN     "stripePaymentMethodType" TEXT;

-- AlterTable
ALTER TABLE "PeriodBreak" ADD COLUMN     "trackId" TEXT,
ALTER COLUMN "periodId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "PlannedAbsence" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "sessionDate" TIMESTAMP(3) NOT NULL,
    "reason" "AbsenceReason" NOT NULL DEFAULT 'OTHER',
    "reasonText" TEXT,
    "notifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlannedAbsence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgDiscountRule" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "ruleType" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "appliesTo" "DiscountScope" NOT NULL DEFAULT 'BOTH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgDiscountRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledTask" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT,
    "name" TEXT NOT NULL,
    "taskType" "ScheduledTaskType" NOT NULL,
    "cronExpression" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "lastRunAt" TIMESTAMP(3),
    "lastRunStatus" "TaskRunStatus",
    "lastRunMessage" TEXT,
    "nextRunAt" TIMESTAMP(3),
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "failCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "ScheduledTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledTaskRun" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" "TaskRunStatus" NOT NULL,
    "message" TEXT,
    "itemsProcessed" INTEGER NOT NULL DEFAULT 0,
    "itemsFailed" INTEGER NOT NULL DEFAULT 0,
    "details" JSONB,

    CONSTRAINT "ScheduledTaskRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlannedAbsence_trackId_sessionDate_idx" ON "PlannedAbsence"("trackId", "sessionDate");

-- CreateIndex
CREATE INDEX "PlannedAbsence_registrationId_idx" ON "PlannedAbsence"("registrationId");

-- CreateIndex
CREATE UNIQUE INDEX "PlannedAbsence_registrationId_trackId_sessionDate_key" ON "PlannedAbsence"("registrationId", "trackId", "sessionDate");

-- CreateIndex
CREATE INDEX "OrgDiscountRule_organizerId_priority_idx" ON "OrgDiscountRule"("organizerId", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "OrgDiscountRule_organizerId_code_key" ON "OrgDiscountRule"("organizerId", "code");

-- CreateIndex
CREATE INDEX "ScheduledTask_isActive_nextRunAt_idx" ON "ScheduledTask"("isActive", "nextRunAt");

-- CreateIndex
CREATE INDEX "ScheduledTask_organizerId_idx" ON "ScheduledTask"("organizerId");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledTask_organizerId_taskType_key" ON "ScheduledTask"("organizerId", "taskType");

-- CreateIndex
CREATE INDEX "ScheduledTaskRun_taskId_startedAt_idx" ON "ScheduledTaskRun"("taskId", "startedAt");

-- CreateIndex
CREATE INDEX "CourseTrack_periodId_slug_idx" ON "CourseTrack"("periodId", "slug");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- CreateIndex
CREATE INDEX "PeriodBreak_trackId_startDate_endDate_idx" ON "PeriodBreak"("trackId", "startDate", "endDate");

-- AddForeignKey
ALTER TABLE "PlannedAbsence" ADD CONSTRAINT "PlannedAbsence_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedAbsence" ADD CONSTRAINT "PlannedAbsence_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "CourseTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodBreak" ADD CONSTRAINT "PeriodBreak_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "CourseTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgDiscountRule" ADD CONSTRAINT "OrgDiscountRule_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledTask" ADD CONSTRAINT "ScheduledTask_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledTask" ADD CONSTRAINT "ScheduledTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "UserAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledTaskRun" ADD CONSTRAINT "ScheduledTaskRun_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ScheduledTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
