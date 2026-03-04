-- Fix conversion tracking: replace outbound-click model with UTM attribution on orders
-- Previous migration (20260304000000) added the wrong ConversionEvent model and a
-- conversionWebhookSecret that is not needed. This migration corrects that.

-- 1. Drop the incorrect ConversionEvent table and enum
DROP TABLE IF EXISTS "ConversionEvent";
DROP TYPE IF EXISTS "ConversionEventType";

-- 2. Drop the conversionWebhookSecret column that was for the wrong use-case
ALTER TABLE "Organizer"
  DROP COLUMN IF EXISTS "conversionWebhookSecret";

-- 3. Add UTM attribution columns to Order (capture how the buyer arrived)
ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "utmSource"   TEXT,
  ADD COLUMN IF NOT EXISTS "utmMedium"   TEXT,
  ADD COLUMN IF NOT EXISTS "utmCampaign" TEXT,
  ADD COLUMN IF NOT EXISTS "utmContent"  TEXT,
  ADD COLUMN IF NOT EXISTS "utmTerm"     TEXT,
  ADD COLUMN IF NOT EXISTS "utmReferrer" TEXT;

-- 4. Index for UTM attribution analytics
CREATE INDEX IF NOT EXISTS "Order_organizerId_utmSource_idx"
  ON "Order"("organizerId", "utmSource");
