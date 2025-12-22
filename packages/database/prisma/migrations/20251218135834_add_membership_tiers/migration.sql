/*
  Warnings:

  - You are about to drop the column `membershipBenefits` on the `Organizer` table. All the data in the column will be lost.
  - You are about to drop the column `membershipPriceCents` on the `Organizer` table. All the data in the column will be lost.
  - Added the required column `tierId` to the `Membership` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "tierId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Organizer" DROP COLUMN "membershipBenefits",
DROP COLUMN "membershipPriceCents";

-- CreateTable
CREATE TABLE "MembershipTier" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL,
    "benefits" JSONB,
    "discountPercent" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipTier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MembershipTier_organizerId_enabled_idx" ON "MembershipTier"("organizerId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipTier_organizerId_slug_key" ON "MembershipTier"("organizerId", "slug");

-- CreateIndex
CREATE INDEX "Membership_tierId_idx" ON "Membership"("tierId");

-- AddForeignKey
ALTER TABLE "MembershipTier" ADD CONSTRAINT "MembershipTier_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "MembershipTier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
