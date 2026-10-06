-- CreateTable
CREATE TABLE "Language" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Language_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Language_ownerId_idx" ON "Language"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Language_ownerId_name_key" ON "Language"("ownerId", "name");
