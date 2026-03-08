-- CreateTable
CREATE TABLE "PeriodBreak" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PeriodBreak_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PeriodBreak_periodId_startDate_endDate_idx" ON "PeriodBreak"("periodId", "startDate", "endDate");

-- AddForeignKey
ALTER TABLE "PeriodBreak" ADD CONSTRAINT "PeriodBreak_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "CoursePeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;
