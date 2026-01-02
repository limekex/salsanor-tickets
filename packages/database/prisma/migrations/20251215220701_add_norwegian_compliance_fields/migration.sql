/*
  Warnings:

  - A unique constraint covering the columns `[organizationNumber]` on the table `Organizer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeConnectAccountId]` on the table `Organizer` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `subtotalAfterDiscountCents` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED', 'CREDITED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "mvaCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "mvaRate" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- Backfill subtotalAfterDiscountCents for existing orders
ALTER TABLE "Order" ADD COLUMN "subtotalAfterDiscountCents" INTEGER;
UPDATE "Order" SET "subtotalAfterDiscountCents" = "subtotalCents" - "discountCents";
ALTER TABLE "Order" ALTER COLUMN "subtotalAfterDiscountCents" SET NOT NULL;

-- AlterTable
ALTER TABLE "Organizer" ADD COLUMN     "accountingSystem" TEXT,
ADD COLUMN     "bankAccount" TEXT,
ADD COLUMN     "companyType" TEXT,
ADD COLUMN     "fiscalYearStart" TIMESTAMP(3),
ADD COLUMN     "invoiceAddress" JSONB,
ADD COLUMN     "invoiceEmail" TEXT,
ADD COLUMN     "invoicePrefix" TEXT NOT NULL DEFAULT 'INV',
ADD COLUMN     "legalName" TEXT,
ADD COLUMN     "mvaRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "mvaReportingRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nextInvoiceNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "organizationNumber" TEXT,
ADD COLUMN     "stripeConnectAccountId" TEXT,
ADD COLUMN     "stripeFeePercentage" DECIMAL(65,30) NOT NULL DEFAULT 2.5,
ADD COLUMN     "stripeFixedFeeCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stripeOnboardingComplete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "swiftBic" TEXT,
ADD COLUMN     "vatRegistered" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerOrgNr" TEXT,
    "customerAddress" JSONB,
    "subtotalCents" INTEGER NOT NULL,
    "mvaRate" DECIMAL(65,30) NOT NULL,
    "mvaCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NOK',
    "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paymentTerms" TEXT NOT NULL DEFAULT 'Due upon receipt',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "paidAt" TIMESTAMP(3),
    "paidAmount" INTEGER,
    "sentAt" TIMESTAMP(3),
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditNote" (
    "id" TEXT NOT NULL,
    "creditNumber" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "mvaCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_orderId_key" ON "Invoice"("orderId");

-- CreateIndex
CREATE INDEX "Invoice_organizerId_invoiceNumber_idx" ON "Invoice"("organizerId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_invoiceDate_idx" ON "Invoice"("invoiceDate");

-- CreateIndex
CREATE UNIQUE INDEX "CreditNote_creditNumber_key" ON "CreditNote"("creditNumber");

-- CreateIndex
CREATE INDEX "CreditNote_organizerId_creditNumber_idx" ON "CreditNote"("organizerId", "creditNumber");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Organizer_organizationNumber_key" ON "Organizer"("organizationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Organizer_stripeConnectAccountId_key" ON "Organizer"("stripeConnectAccountId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
