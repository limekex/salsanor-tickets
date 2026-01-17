-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "stripeChargeId" TEXT,
ADD COLUMN     "stripeTransactionId" TEXT;

-- AlterTable
ALTER TABLE "Organizer" ADD COLUMN     "nextOrderNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "orderPrefix" TEXT NOT NULL DEFAULT 'ORD';
