/*
  Warnings:

  - A unique constraint covering the columns `[verificationToken]` on the table `Membership` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "verificationToken" TEXT;

-- AlterTable
ALTER TABLE "PersonProfile" ADD COLUMN     "photoUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Membership_verificationToken_key" ON "Membership"("verificationToken");

-- CreateIndex
CREATE INDEX "Membership_verificationToken_idx" ON "Membership"("verificationToken");
