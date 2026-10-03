-- CreateEnum
CREATE TYPE "DateStatus" AS ENUM ('scheduled', 'live', 'done', 'error');

-- CreateTable
CREATE TABLE "Date" (
    "id" TEXT NOT NULL,
    "aId" TEXT NOT NULL,
    "bId" TEXT NOT NULL,
    "status" "DateStatus" NOT NULL DEFAULT 'scheduled',
    "venue" JSONB,
    "prescreen" DOUBLE PRECISION NOT NULL,
    "mutual" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Date_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Turn" (
    "id" TEXT NOT NULL,
    "dateId" TEXT NOT NULL,
    "idx" INTEGER NOT NULL,
    "speakerId" TEXT,
    "message" TEXT NOT NULL,
    "thought" TEXT,
    "interest" DOUBLE PRECISION,

    CONSTRAINT "Turn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Debrief" (
    "id" TEXT NOT NULL,
    "dateId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "Debrief_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Date_aId_bId_key" ON "Date"("aId", "bId");

-- CreateIndex
CREATE UNIQUE INDEX "Turn_dateId_idx_key" ON "Turn"("dateId", "idx");

-- CreateIndex
CREATE UNIQUE INDEX "Debrief_dateId_personId_key" ON "Debrief"("dateId", "personId");

-- AddForeignKey
ALTER TABLE "Date" ADD CONSTRAINT "Date_aId_fkey" FOREIGN KEY ("aId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Date" ADD CONSTRAINT "Date_bId_fkey" FOREIGN KEY ("bId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turn" ADD CONSTRAINT "Turn_dateId_fkey" FOREIGN KEY ("dateId") REFERENCES "Date"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Debrief" ADD CONSTRAINT "Debrief_dateId_fkey" FOREIGN KEY ("dateId") REFERENCES "Date"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Debrief" ADD CONSTRAINT "Debrief_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
