-- AlterTable
ALTER TABLE "Organizer" ADD COLUMN     "membershipBenefits" JSONB,
ADD COLUMN     "membershipDescription" TEXT,
ADD COLUMN     "membershipEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "membershipPriceCents" INTEGER,
ADD COLUMN     "membershipSalesOpen" BOOLEAN NOT NULL DEFAULT true;
