-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "linkedinUrl" TEXT NOT NULL,
    "instagramUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Person_linkedinUrl_key" ON "Person"("linkedinUrl");

-- CreateIndex
CREATE UNIQUE INDEX "Person_instagramUrl_key" ON "Person"("instagramUrl");
