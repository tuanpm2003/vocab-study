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
} from "@/types/api";

function json(method: string, body: unknown): RequestInit {
  return { method, body: JSON.stringify(body) };
}

const del: RequestInit = { method: "DELETE" };

export const languagesApi = {
  // limit=100 là trần của backend. Một người học hiếm khi vượt quá vài ngôn ngữ,
  // nên trang Languages không cần điều khiển phân trang.
  list: () => apiFetch<Paginated<Language>>("/languages?limit=100"),
  get: (id: string) => apiFetch<LanguageDetail>(`/languages/${id}`),
  create: (input: LanguageInput) =>
    apiFetch<Language>("/languages", json("POST", input)),
  update: (id: string, input: LanguageInput) =>
    apiFetch<Language>(`/languages/${id}`, json("PATCH", input)),
  remove: (id: string) => apiFetch<void>(`/languages/${id}`, del),
};

export const levelSystemsApi = {
  create: (languageId: string, input: LevelSystemInput) =>
    apiFetch<LevelSystem>(
      `/languages/${languageId}/level-systems`,
      json("POST", input),
    ),
  update: (id: string, input: { name?: string; isDefault?: boolean }) =>
    apiFetch<LevelSystem>(`/level-systems/${id}`, json("PATCH", input)),
  remove: (id: string) => apiFetch<void>(`/level-systems/${id}`, del),
  addLevel: (id: string, name: string) =>
    apiFetch<Level>(`/level-systems/${id}/levels`, json("POST", { name })),
  reorderLevels: (id: string, levelIds: string[]) =>
    apiFetch<LevelSystem>(
      `/level-systems/${id}/levels/reorder`,
      json("POST", { levelIds }),
    ),
  renameLevel: (levelId: string, name: string) =>
    apiFetch<Level>(`/levels/${levelId}`, json("PATCH", { name })),
  removeLevel: (levelId: string) => apiFetch<void>(`/levels/${levelId}`, del),
};

export const collectionsApi = {
  // Cây trong trang ngôn ngữ cần mọi collection của MỘT ngôn ngữ. 100 là trần của
  // backend; vượt quá thì giao diện báo rõ thay vì âm thầm thiếu.
  listByLanguage: (languageId: string) =>
    apiFetch<Paginated<Collection>>(
      `/collections?languageId=${encodeURIComponent(languageId)}&limit=100`,
    ),
  get: (id: string) => apiFetch<Collection>(`/collections/${id}`),
  create: (input: CollectionInput) =>
    apiFetch<Collection>("/collections", json("POST", input)),
  update: (id: string, input: Omit<CollectionInput, "languageId">) =>
    apiFetch<Collection>(`/collections/${id}`, json("PATCH", input)),
  remove: (id: string) => apiFetch<void>(`/collections/${id}`, del),
};
