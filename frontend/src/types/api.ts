// Hình dạng dữ liệu backend trả về — phải khớp docs/API.md.

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface NamedRef {
  id: string;
  name: string;
}

export interface Language {
  id: string;
  name: string;
  code: string | null;
  vocabularyCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface LanguageInput {
  name: string;
  code?: string;
}

export interface Level {
  id: string;
  levelSystemId: string;
  name: string;
  order: number;
}

export interface LevelSystem {
  id: string;
  languageId: string;
  name: string;
  isDefault: boolean;
  levels: Level[];
}

export interface LanguageDetail extends Language {
  levelSystems: LevelSystem[];
}

export interface LevelSystemInput {
  name: string;
  isDefault?: boolean;
  levels?: { name: string }[];
}

export type CollectionKind = "LESSON" | "TOPIC";

export interface Collection {
  id: string;
  languageId: string;
  language: NamedRef;
  levelId: string | null;
  level: NamedRef | null;
  name: string;
  kind: CollectionKind;
  description: string | null;
  vocabularyCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Vocabulary {
  id: string;
  term: string;
  meaning: string;
  reading: string | null;
  romanization: string | null;
  exampleSentence: string | null;
  exampleTranslation: string | null;
  notes: string | null;
  extra: Record<string, unknown> | null;
  language: NamedRef & { code: string | null };
  level: NamedRef | null;
  collections: NamedRef[];
  createdAt: string;
  updatedAt: string;
}

export interface VocabularyWarning {
  code: "POSSIBLE_DUPLICATE";
  message: string;
  existingIds: string[];
}

export type CreatedVocabulary = Vocabulary & { warnings?: VocabularyWarning[] };

export interface VocabularyInput {
  languageId: string;
  levelId: string | null;
  collectionIds: string[];
  term: string;
  meaning: string;
  reading: string | null;
  romanization: string | null;
  exampleSentence: string | null;
  exampleTranslation: string | null;
  notes: string | null;
}

export const VOCABULARY_SORTS = [
  "createdAt:desc",
  "createdAt:asc",
  "updatedAt:desc",
  "term:asc",
  "term:desc",
] as const;
export type VocabularySort = (typeof VOCABULARY_SORTS)[number];

export interface VocabularyQuery {
  page: number;
  limit: number;
  search: string;
  languageId: string;
  levelId: string;
  collectionId: string;
  sort: VocabularySort;
}

export interface CollectionInput {
  languageId: string;
  levelId: string | null;
  name: string;
  kind: CollectionKind;
  description: string | null;
}

export type StudyMode = "flashcard" | "multiple_choice";

export interface SessionParams {
  mode: StudyMode;
  languageId: string;
  levelId: string;
  collectionId: string;
  limit: number;
}

export interface SessionItem {
  vocabulary: Vocabulary;
}

export interface Session {
  items: SessionItem[];
}
