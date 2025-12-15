-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'ORGANIZER', 'INSTRUCTOR', 'CHECKIN', 'STAFF', 'PARTICIPANT');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('DRAFT', 'PENDING_PAYMENT', 'ACTIVE', 'WAITLIST', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "TrackRole" AS ENUM ('LEADER', 'FOLLOWER', 'ANY');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'PENDING', 'PAID', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'VIPPS');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('REQUIRES_ACTION', 'SUCCEEDED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('ON_WAITLIST', 'OFFERED', 'EXPIRED', 'ACCEPTED', 'REMOVED');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('ACTIVE', 'VOIDED');

-- CreateEnum
CREATE TYPE "CheckInType" AS ENUM ('PERIOD_ENTRY', 'SESSION_ENTRY');

-- CreateTable
CREATE TABLE "UserAccount" (
    "id" TEXT NOT NULL,
    "supabaseUid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAccountRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAccountRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoursePeriod" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "locationName" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "salesOpenAt" TIMESTAMP(3) NOT NULL,
    "salesCloseAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Oslo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoursePeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseTrack" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "levelLabel" TEXT,
    "weekday" INTEGER NOT NULL,
    "timeStart" TEXT NOT NULL,
    "timeEnd" TEXT NOT NULL,
    "capacityTotal" INTEGER NOT NULL,
    "capacityLeaders" INTEGER,
    "capacityFollowers" INTEGER,
    "rolePolicy" "TrackRole" NOT NULL DEFAULT 'ANY',
    "waitlistEnabled" BOOLEAN NOT NULL DEFAULT true,
    "priceSingleCents" INTEGER NOT NULL,
    "pricePairCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackSession" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PairGroup" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PairGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Registration" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'DRAFT',
    "chosenRole" "TrackRole" NOT NULL DEFAULT 'ANY',
    "pairGroupId" TEXT,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Registration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'ON_WAITLIST',
    "offeredUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "purchaserPersonId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'NOK',
    "subtotalCents" INTEGER NOT NULL,
    "discountCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "pricingSnapshot" JSONB NOT NULL,
    "providerCheckoutRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "providerPaymentRef" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NOK',
    "rawPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'ACTIVE',
    "qrTokenHash" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "type" "CheckInType" NOT NULL,
    "sessionId" TEXT,
    "scannedByUserId" TEXT,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta" JSONB,

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "org" TEXT NOT NULL DEFAULT 'SALSANOR',
    "memberNumber" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "source" TEXT NOT NULL DEFAULT 'IMPORT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountRule" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "ruleType" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscountRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserAccount_supabaseUid_key" ON "UserAccount"("supabaseUid");

-- CreateIndex
CREATE UNIQUE INDEX "UserAccount_email_key" ON "UserAccount"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserAccountRole_userId_role_key" ON "UserAccountRole"("userId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "PersonProfile_userId_key" ON "PersonProfile"("userId");

-- CreateIndex
CREATE INDEX "PersonProfile_email_idx" ON "PersonProfile"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CoursePeriod_code_key" ON "CoursePeriod"("code");

-- CreateIndex
CREATE INDEX "CoursePeriod_startDate_endDate_idx" ON "CoursePeriod"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "CourseTrack_periodId_idx" ON "CourseTrack"("periodId");

-- CreateIndex
CREATE INDEX "TrackSession_trackId_startsAt_idx" ON "TrackSession"("trackId", "startsAt");

-- CreateIndex
CREATE INDEX "PairGroup_periodId_idx" ON "PairGroup"("periodId");

-- CreateIndex
CREATE INDEX "Registration_periodId_trackId_idx" ON "Registration"("periodId", "trackId");

-- CreateIndex
CREATE UNIQUE INDEX "Registration_trackId_personId_key" ON "Registration"("trackId", "personId");

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistEntry_registrationId_key" ON "WaitlistEntry"("registrationId");

-- CreateIndex
CREATE INDEX "Order_periodId_status_idx" ON "Order"("periodId", "status");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_qrTokenHash_key" ON "Ticket"("qrTokenHash");

-- CreateIndex
CREATE INDEX "Ticket_periodId_idx" ON "Ticket"("periodId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_periodId_personId_key" ON "Ticket"("periodId", "personId");

-- CreateIndex
CREATE INDEX "CheckIn_ticketId_scannedAt_idx" ON "CheckIn"("ticketId", "scannedAt");

-- CreateIndex
CREATE INDEX "Membership_personId_validTo_idx" ON "Membership"("personId", "validTo");

-- CreateIndex
CREATE INDEX "DiscountRule_periodId_priority_idx" ON "DiscountRule"("periodId", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountRule_periodId_code_key" ON "DiscountRule"("periodId", "code");

-- AddForeignKey
ALTER TABLE "UserAccountRole" ADD CONSTRAINT "UserAccountRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonProfile" ADD CONSTRAINT "PersonProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseTrack" ADD CONSTRAINT "CourseTrack_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "CoursePeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackSession" ADD CONSTRAINT "TrackSession_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "CourseTrack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PairGroup" ADD CONSTRAINT "PairGroup_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "CoursePeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "CoursePeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "CourseTrack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_personId_fkey" FOREIGN KEY ("personId") REFERENCES "PersonProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_pairGroupId_fkey" FOREIGN KEY ("pairGroupId") REFERENCES "PairGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "CoursePeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_purchaserPersonId_fkey" FOREIGN KEY ("purchaserPersonId") REFERENCES "PersonProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "CoursePeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_personId_fkey" FOREIGN KEY ("personId") REFERENCES "PersonProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrackSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_personId_fkey" FOREIGN KEY ("personId") REFERENCES "PersonProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountRule" ADD CONSTRAINT "DiscountRule_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "CoursePeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
