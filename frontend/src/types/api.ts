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

export const LEARNING_STATUSES = [
  "NEW",
  "LEARNING",
  "REVIEW",
  "MASTERED",
] as const;
export type LearningStatus = (typeof LEARNING_STATUSES)[number];

export interface Progress {
  status: LearningStatus;
  reviewCount: number;
  correctCount: number;
  incorrectCount: number;
  lastReviewedAt: string | null;
  /** Hạn ôn kế tiếp (ADR-012). null = chưa ôn lần nào, hoặc dữ liệu trước Phase 11. */
  dueAt: string | null;
  /** Số ngày giữa lần ôn vừa rồi và hạn ôn kế tiếp. */
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
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
  /** Luôn có: từ chưa ôn lần nào là NEW với mọi bộ đếm bằng 0. */
  progress: Progress;
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
  /** "" = mọi trạng thái. */
  status: LearningStatus | "";
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

export type QuestionType = "term_to_meaning" | "meaning_to_term";

export interface SessionParams {
  mode: StudyMode;
  /** Chỉ dùng với mode = multiple_choice. */
  questionType?: QuestionType;
  languageId: string;
  levelId: string;
  collectionId: string;
  limit: number;
}

export interface QuizItem {
  vocabulary: Vocabulary;
  questionType: QuestionType;
  prompt: string;
  choices: string[];
  correctIndex: number;
}

/** Flashcard chỉ có `vocabulary`; trắc nghiệm có đủ các field của QuizItem. */
export type SessionItem = Pick<QuizItem, "vocabulary"> &
  Partial<QuizItem> & {
    /** Chỉ có ở phiên flashcard: số ngày tới lần ôn kế tiếp nếu chấm từng mức. */
    intervals?: Record<Rating, number>;
  };

export function isQuizItem(item: SessionItem): item is QuizItem {
  return Array.isArray(item.choices) && typeof item.correctIndex === "number";
}

export interface Session {
  items: SessionItem[];
}

export interface DueSession extends Session {
  /** Tổng số từ cần ôn trong phạm vi, không chỉ số từ của phiên này. */
  total: number;
}

export type Rating = "AGAIN" | "HARD" | "GOOD" | "EASY";

export type ReviewInput =
  | { vocabularyId: string; mode: "FLASHCARD"; rating: Rating }
  | { vocabularyId: string; mode: "MULTIPLE_CHOICE"; isCorrect: boolean };

export interface ReviewTally {
  reviewed: number;
  correct: number;
  incorrect: number;
}

export interface Stats {
  today: ReviewTally & {
    /** 0..1; null khi hôm nay chưa ôn từ nào. */
    accuracy: number | null;
  };
  byLanguage: (ReviewTally & { languageId: string; name: string })[];
  totals: {
    languages: number;
    vocabulary: number;
    new: number;
    learning: number;
    review: number;
    mastered: number;
  };
  dueCount: number;
  streak: number;
}
