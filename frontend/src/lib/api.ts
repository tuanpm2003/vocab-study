import { apiFetch } from "@/lib/api-client";
import type {
  Collection,
  CollectionInput,
  Language,
  LanguageDetail,
  LanguageInput,
  Level,
  LevelSystem,
  LevelSystemInput,
  Paginated,
  CreatedVocabulary,
  DueSession,
  Progress,
  ReviewInput,
  Session,
  SessionParams,
  Stats,
  Vocabulary,
  VocabularyInput,
  VocabularyQuery,
} from "@/types/api";

function json(method: string, body: unknown): RequestInit {
  return { method, body: JSON.stringify(body) };
}

const del: RequestInit = { method: "DELETE" };

/** id lấy từ URL của trình duyệt: encode để "a/../b" không thành một đường dẫn API khác. */
const enc = encodeURIComponent;

export const languagesApi = {
  // limit=100 là trần của backend. Một người học hiếm khi vượt quá vài ngôn ngữ,
  // nên trang Languages không cần điều khiển phân trang.
  list: () => apiFetch<Paginated<Language>>("/languages?limit=100"),
  get: (id: string) => apiFetch<LanguageDetail>(`/languages/${enc(id)}`),
  create: (input: LanguageInput) =>
    apiFetch<Language>("/languages", json("POST", input)),
  update: (id: string, input: LanguageInput) =>
    apiFetch<Language>(`/languages/${enc(id)}`, json("PATCH", input)),
  remove: (id: string) => apiFetch<void>(`/languages/${enc(id)}`, del),
};

export const levelSystemsApi = {
  create: (languageId: string, input: LevelSystemInput) =>
    apiFetch<LevelSystem>(
      `/languages/${enc(languageId)}/level-systems`,
      json("POST", input),
    ),
  update: (id: string, input: { name?: string; isDefault?: boolean }) =>
    apiFetch<LevelSystem>(`/level-systems/${enc(id)}`, json("PATCH", input)),
  remove: (id: string) => apiFetch<void>(`/level-systems/${enc(id)}`, del),
  addLevel: (id: string, name: string) =>
    apiFetch<Level>(`/level-systems/${enc(id)}/levels`, json("POST", { name })),
  reorderLevels: (id: string, levelIds: string[]) =>
    apiFetch<LevelSystem>(
      `/level-systems/${enc(id)}/levels/reorder`,
      json("POST", { levelIds }),
    ),
  renameLevel: (levelId: string, name: string) =>
    apiFetch<Level>(`/levels/${enc(levelId)}`, json("PATCH", { name })),
  removeLevel: (levelId: string) =>
    apiFetch<void>(`/levels/${enc(levelId)}`, del),
};

export const collectionsApi = {
  // Cây trong trang ngôn ngữ cần mọi collection của MỘT ngôn ngữ. 100 là trần của
  // backend; vượt quá thì giao diện báo rõ thay vì âm thầm thiếu.
  listByLanguage: (languageId: string) =>
    apiFetch<Paginated<Collection>>(
      `/collections?languageId=${enc(languageId)}&limit=100`,
    ),
  get: (id: string) => apiFetch<Collection>(`/collections/${enc(id)}`),
  create: (input: CollectionInput) =>
    apiFetch<Collection>("/collections", json("POST", input)),
  update: (id: string, input: Omit<CollectionInput, "languageId">) =>
    apiFetch<Collection>(`/collections/${enc(id)}`, json("PATCH", input)),
  remove: (id: string) => apiFetch<void>(`/collections/${enc(id)}`, del),
};

/** Bỏ các tham số rỗng: `?search=` vô nghĩa và làm URL dài không cần thiết. */
export function toQueryString(
  params: Record<string, string | number | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  return search.toString();
}

export const vocabulariesApi = {
  list: (query: Partial<VocabularyQuery>) =>
    apiFetch<Paginated<Vocabulary>>(`/vocabularies?${toQueryString(query)}`),
  get: (id: string) => apiFetch<Vocabulary>(`/vocabularies/${enc(id)}`),
  create: (input: VocabularyInput) =>
    apiFetch<CreatedVocabulary>("/vocabularies", json("POST", input)),
  update: (id: string, input: Omit<VocabularyInput, "languageId">) =>
    apiFetch<Vocabulary>(`/vocabularies/${enc(id)}`, json("PATCH", input)),
  remove: (id: string) => apiFetch<void>(`/vocabularies/${enc(id)}`, del),
};

export const learningApi = {
  stats: () => apiFetch<Stats>("/learning/stats"),
  due: (params: { languageId?: string; limit: number }) =>
    apiFetch<DueSession>(`/learning/due?${toQueryString(params)}`),
  review: (input: ReviewInput) =>
    apiFetch<Progress & { vocabularyId: string }>(
      "/learning/review",
      json("POST", input),
    ),
  session: (params: SessionParams) =>
    apiFetch<Session>(`/learning/session?${toQueryString({ ...params })}`),
};
