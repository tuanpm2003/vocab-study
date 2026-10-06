-- CreateTable
CREATE TABLE "Vocabulary" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,
    "levelId" TEXT,
    "term" TEXT NOT NULL,
    "meaning" TEXT NOT NULL,
    "reading" TEXT,
    "romanization" TEXT,
    "exampleSentence" TEXT,
    "exampleTranslation" TEXT,
    "notes" TEXT,
    "extra" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vocabulary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabularyCollection" (
    "vocabularyId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VocabularyCollection_pkey" PRIMARY KEY ("vocabularyId","collectionId")
);

-- CreateIndex
CREATE INDEX "Vocabulary_ownerId_languageId_idx" ON "Vocabulary"("ownerId", "languageId");

-- CreateIndex
CREATE INDEX "Vocabulary_languageId_term_idx" ON "Vocabulary"("languageId", "term");

-- CreateIndex
CREATE INDEX "Vocabulary_levelId_idx" ON "Vocabulary"("levelId");

-- CreateIndex
CREATE INDEX "VocabularyCollection_collectionId_idx" ON "VocabularyCollection"("collectionId");

-- AddForeignKey
ALTER TABLE "Vocabulary" ADD CONSTRAINT "Vocabulary_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vocabulary" ADD CONSTRAINT "Vocabulary_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyCollection" ADD CONSTRAINT "VocabularyCollection_vocabularyId_fkey" FOREIGN KEY ("vocabularyId") REFERENCES "Vocabulary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyCollection" ADD CONSTRAINT "VocabularyCollection_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
