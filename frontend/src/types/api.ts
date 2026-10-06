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

export interface CollectionInput {
  languageId: string;
  levelId: string | null;
  name: string;
  kind: CollectionKind;
  description: string | null;
}
