/*
  Warnings:

  - You are about to drop the column `org` on the `Membership` table. All the data in the column will be lost.
  - The `status` column on the `Membership` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[personId,organizerId,validFrom]` on the table `Membership` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `organizerId` to the `Membership` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Membership` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('COURSE_PERIOD', 'EVENT', 'MEMBERSHIP');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING_PAYMENT');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('SINGLE', 'RECURRING');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED');

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_periodId_fkey";

-- AlterTable
ALTER TABLE "Membership" DROP COLUMN "org",
ADD COLUMN     "autoRenew" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "orderId" TEXT,
ADD COLUMN     "organizerId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "orderType" "OrderType" NOT NULL DEFAULT 'COURSE_PERIOD',
ALTER COLUMN "periodId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventType" "EventType" NOT NULL DEFAULT 'SINGLE',
    "startDateTime" TIMESTAMP(3) NOT NULL,
    "endDateTime" TIMESTAMP(3),
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Oslo',
    "locationName" TEXT,
    "locationAddress" TEXT,
    "city" TEXT,
    "salesOpenAt" TIMESTAMP(3) NOT NULL,
    "salesCloseAt" TIMESTAMP(3) NOT NULL,
    "capacityTotal" INTEGER NOT NULL,
    "requiresRole" BOOLEAN NOT NULL DEFAULT false,
    "basePriceCents" INTEGER NOT NULL,
    "memberPriceCents" INTEGER,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRegistration" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "orderId" TEXT,
    "chosenRole" "TrackRole",
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventTicket" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "qrTokenHash" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'ACTIVE',
    "checkedInAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_organizerId_startDateTime_idx" ON "Event"("organizerId", "startDateTime");

-- CreateIndex
CREATE INDEX "Event_published_startDateTime_idx" ON "Event"("published", "startDateTime");

-- CreateIndex
CREATE UNIQUE INDEX "Event_organizerId_slug_key" ON "Event"("organizerId", "slug");

-- CreateIndex
CREATE INDEX "EventRegistration_eventId_status_idx" ON "EventRegistration"("eventId", "status");

-- CreateIndex
CREATE INDEX "EventRegistration_personId_idx" ON "EventRegistration"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "EventRegistration_eventId_personId_key" ON "EventRegistration"("eventId", "personId");

-- CreateIndex
CREATE UNIQUE INDEX "EventTicket_qrTokenHash_key" ON "EventTicket"("qrTokenHash");

-- CreateIndex
CREATE INDEX "EventTicket_personId_idx" ON "EventTicket"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "EventTicket_eventId_personId_key" ON "EventTicket"("eventId", "personId");

-- CreateIndex
CREATE INDEX "Membership_organizerId_status_idx" ON "Membership"("organizerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_personId_organizerId_validFrom_key" ON "Membership"("personId", "organizerId", "validFrom");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "CoursePeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_personId_fkey" FOREIGN KEY ("personId") REFERENCES "PersonProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTicket" ADD CONSTRAINT "EventTicket_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTicket" ADD CONSTRAINT "EventTicket_personId_fkey" FOREIGN KEY ("personId") REFERENCES "PersonProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
