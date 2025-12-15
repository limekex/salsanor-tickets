/*
  Warnings:

  - A unique constraint covering the columns `[userId,role,organizerId]` on the table `UserAccountRole` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `organizerId` to the `CoursePeriod` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "UserAccountRole_userId_role_key";

-- AlterTable
ALTER TABLE "CoursePeriod" ADD COLUMN     "organizerId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "UserAccountRole" ADD COLUMN     "organizerId" TEXT;

-- CreateTable
CREATE TABLE "Organizer" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "website" TEXT,
    "contactEmail" TEXT,
    "city" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Norway',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Oslo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organizer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentConfig" (
    "id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "isTest" BOOLEAN NOT NULL DEFAULT true,
    "secretKey" TEXT,
    "publishableKey" TEXT,
    "webhookSecret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organizer_slug_key" ON "Organizer"("slug");

-- CreateIndex
CREATE INDEX "Organizer_slug_idx" ON "Organizer"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentConfig_provider_key" ON "PaymentConfig"("provider");

-- CreateIndex
CREATE INDEX "CoursePeriod_organizerId_idx" ON "CoursePeriod"("organizerId");

-- CreateIndex
CREATE INDEX "UserAccountRole_organizerId_idx" ON "UserAccountRole"("organizerId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAccountRole_userId_role_organizerId_key" ON "UserAccountRole"("userId", "role", "organizerId");

-- AddForeignKey
ALTER TABLE "UserAccountRole" ADD CONSTRAINT "UserAccountRole_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoursePeriod" ADD CONSTRAINT "CoursePeriod_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
