// Hình dạng dữ liệu backend trả về — phải khớp docs/API.md.

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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
