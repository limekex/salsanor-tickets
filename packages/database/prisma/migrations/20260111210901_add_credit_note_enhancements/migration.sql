/*
  Warnings:

  - You are about to drop the column `amountCents` on the `CreditNote` table. All the data in the column will be lost.
  - The `status` column on the `CreditNote` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `originalAmountCents` to the `CreditNote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `refundAmountCents` to the `CreditNote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `CreditNote` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CreditNoteStatus" AS ENUM ('DRAFT', 'ISSUED', 'SENT', 'VOIDED');

-- CreateEnum
CREATE TYPE "RefundType" AS ENUM ('FULL', 'PARTIAL', 'NONE');

-- CreateEnum
CREATE TYPE "PdfTemplateType" AS ENUM ('EVENT_TICKET', 'COURSE_TICKET', 'ORDER_RECEIPT', 'MEMBERSHIP_CARD', 'CREDIT_NOTE');

-- DropForeignKey
ALTER TABLE "CreditNote" DROP CONSTRAINT "CreditNote_invoiceId_fkey";

-- AlterTable
ALTER TABLE "CreditNote" DROP COLUMN "amountCents",
ADD COLUMN     "orderId" TEXT,
ADD COLUMN     "originalAmountCents" INTEGER NOT NULL,
ADD COLUMN     "pdfGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "pdfUrl" TEXT,
ADD COLUMN     "refundAmountCents" INTEGER NOT NULL,
ADD COLUMN     "refundType" "RefundType" NOT NULL DEFAULT 'FULL',
ADD COLUMN     "registrationId" TEXT,
ADD COLUMN     "sentAt" TIMESTAMP(3),
ADD COLUMN     "stripeRefundId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "invoiceId" DROP NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "CreditNoteStatus" NOT NULL DEFAULT 'ISSUED';

-- CreateTable
CREATE TABLE "EmailPdfAttachment" (
    "id" TEXT NOT NULL,
    "emailTemplateId" TEXT NOT NULL,
    "pdfTemplateType" "PdfTemplateType" NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailPdfAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PdfTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PdfTemplateType" NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "headerConfig" JSONB,
    "bodyConfig" JSONB,
    "footerConfig" JSONB,
    "qrConfig" JSONB,
    "includeSellerInfo" BOOLEAN NOT NULL DEFAULT true,
    "includePlatformInfo" BOOLEAN NOT NULL DEFAULT true,
    "includeBuyerInfo" BOOLEAN NOT NULL DEFAULT true,
    "includeVatBreakdown" BOOLEAN NOT NULL DEFAULT true,
    "includePaymentInfo" BOOLEAN NOT NULL DEFAULT true,
    "includeTerms" BOOLEAN NOT NULL DEFAULT true,
    "headerText" TEXT,
    "footerText" TEXT,
    "termsText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "PdfTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailPdfAttachment_emailTemplateId_idx" ON "EmailPdfAttachment"("emailTemplateId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailPdfAttachment_emailTemplateId_pdfTemplateType_key" ON "EmailPdfAttachment"("emailTemplateId", "pdfTemplateType");

-- CreateIndex
CREATE INDEX "PdfTemplate_type_isActive_idx" ON "PdfTemplate"("type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PdfTemplate_type_isDefault_key" ON "PdfTemplate"("type", "isDefault");

-- CreateIndex
CREATE INDEX "CreditNote_orderId_idx" ON "CreditNote"("orderId");

-- CreateIndex
CREATE INDEX "CreditNote_registrationId_idx" ON "CreditNote"("registrationId");

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailPdfAttachment" ADD CONSTRAINT "EmailPdfAttachment_emailTemplateId_fkey" FOREIGN KEY ("emailTemplateId") REFERENCES "EmailTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
