/*
  Warnings:

  - Added the required column `avatarSeed` to the `Person` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PersonStatus" AS ENUM ('pending', 'scraped', 'analyzed', 'error');

-- CreateEnum
CREATE TYPE "SourceKind" AS ENUM ('linkedin', 'instagram');

-- CreateEnum
CREATE TYPE "ScrapeStatus" AS ENUM ('ok', 'blocked', 'private', 'not_found', 'manual');

-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "avatarSeed" TEXT NOT NULL,
ADD COLUMN     "status" "PersonStatus" NOT NULL DEFAULT 'pending';

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "kind" "SourceKind" NOT NULL,
    "status" "ScrapeStatus" NOT NULL,
    "data" JSONB,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Source_personId_kind_key" ON "Source"("personId", "kind");

-- AddForeignKey
ALTER TABLE "Source" ADD CONSTRAINT "Source_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
