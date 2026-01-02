-- AlterTable
ALTER TABLE "PersonProfile" ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'Norway',
ADD COLUMN     "gdprConsentAt" TIMESTAMP(3),
ADD COLUMN     "organizerMarketingConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "reginorMarketingConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "streetAddress" TEXT,
ADD COLUMN     "touConsentAt" TIMESTAMP(3);
