-- CreateEnum
CREATE TYPE "ConversionEventType" AS ENUM ('OUTBOUND_CLICK', 'CONVERSION');

-- AlterTable: add conversion tracking fields to Organizer
ALTER TABLE "Organizer"
  ADD COLUMN "googleAnalyticsId"        TEXT,
  ADD COLUMN "facebookPixelId"          TEXT,
  ADD COLUMN "googleAdsConversionId"    TEXT,
  ADD COLUMN "googleAdsConversionLabel" TEXT,
  ADD COLUMN "conversionWebhookSecret"  TEXT;

-- CreateTable
CREATE TABLE "ConversionEvent" (
    "id"          TEXT                    NOT NULL,
    "organizerId" TEXT                    NOT NULL,
    "eventType"   "ConversionEventType"   NOT NULL,
    "sessionId"   TEXT,
    "externalUrl" TEXT,
    "utmSource"   TEXT,
    "utmMedium"   TEXT,
    "utmCampaign" TEXT,
    "utmContent"  TEXT,
    "utmTerm"     TEXT,
    "referrer"    TEXT,
    "metadata"    JSONB,
    "createdAt"   TIMESTAMP(3)            NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConversionEvent_organizerId_createdAt_idx" ON "ConversionEvent"("organizerId", "createdAt");

-- CreateIndex
CREATE INDEX "ConversionEvent_sessionId_idx" ON "ConversionEvent"("sessionId");

-- CreateIndex
CREATE INDEX "ConversionEvent_eventType_organizerId_idx" ON "ConversionEvent"("eventType", "organizerId");

-- AddForeignKey
ALTER TABLE "ConversionEvent" ADD CONSTRAINT "ConversionEvent_organizerId_fkey"
  FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
