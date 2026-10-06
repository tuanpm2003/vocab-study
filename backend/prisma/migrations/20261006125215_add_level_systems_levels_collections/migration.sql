-- CreateEnum
CREATE TYPE "CollectionKind" AS ENUM ('LESSON', 'TOPIC');

-- CreateTable
CREATE TABLE "LevelSystem" (
    "id" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LevelSystem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Level" (
    "id" TEXT NOT NULL,
    "levelSystemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Level_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,
    "levelId" TEXT,
    "name" TEXT NOT NULL,
    "kind" "CollectionKind" NOT NULL DEFAULT 'LESSON',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LevelSystem_languageId_idx" ON "LevelSystem"("languageId");

-- CreateIndex
CREATE INDEX "Level_levelSystemId_idx" ON "Level"("levelSystemId");

-- CreateIndex
CREATE UNIQUE INDEX "Level_levelSystemId_name_key" ON "Level"("levelSystemId", "name");

-- CreateIndex
CREATE INDEX "Collection_languageId_idx" ON "Collection"("languageId");

-- CreateIndex
CREATE INDEX "Collection_levelId_idx" ON "Collection"("levelId");

-- AddForeignKey
ALTER TABLE "LevelSystem" ADD CONSTRAINT "LevelSystem_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Level" ADD CONSTRAINT "Level_levelSystemId_fkey" FOREIGN KEY ("levelSystemId") REFERENCES "LevelSystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE SET NULL ON UPDATE CASCADE;
