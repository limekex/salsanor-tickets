-- DropIndex
DROP INDEX "EventTicket_eventId_personId_key";

-- AlterTable
ALTER TABLE "EventRegistration" ADD COLUMN     "unitPriceCents" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "EventTicket" ADD COLUMN     "registrationId" TEXT,
ADD COLUMN     "ticketNumber" INTEGER;

-- CreateIndex
CREATE INDEX "EventTicket_eventId_personId_idx" ON "EventTicket"("eventId", "personId");

-- CreateIndex
CREATE INDEX "EventTicket_registrationId_idx" ON "EventTicket"("registrationId");

-- AddForeignKey
ALTER TABLE "EventTicket" ADD CONSTRAINT "EventTicket_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "EventRegistration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
