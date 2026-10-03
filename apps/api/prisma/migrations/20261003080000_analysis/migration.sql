-- CreateTable
CREATE TABLE "Analysis" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "persona" JSONB NOT NULL,
    "trace" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Analysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Analysis_personId_key" ON "Analysis"("personId");

-- AddForeignKey
ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
