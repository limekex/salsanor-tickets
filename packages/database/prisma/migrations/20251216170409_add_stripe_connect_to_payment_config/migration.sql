-- AlterTable
ALTER TABLE "PaymentConfig" ADD COLUMN     "platformAccountId" TEXT,
ADD COLUMN     "platformFeeFixed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "platformFeePercent" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "useStripeConnect" BOOLEAN NOT NULL DEFAULT false;
