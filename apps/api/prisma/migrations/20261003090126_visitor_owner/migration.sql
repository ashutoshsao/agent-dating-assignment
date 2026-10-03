-- DropIndex
DROP INDEX "Person_instagramUrl_key";

-- DropIndex
DROP INDEX "Person_linkedinUrl_key";

-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "ownerId" TEXT;

-- CreateIndex
CREATE INDEX "Person_linkedinUrl_idx" ON "Person"("linkedinUrl");

-- CreateIndex
CREATE INDEX "Person_ownerId_idx" ON "Person"("ownerId");
