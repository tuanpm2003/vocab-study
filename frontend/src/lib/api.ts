import { apiFetch } from "@/lib/api-client";
import type { Language, LanguageInput, Paginated } from "@/types/api";

function json(method: string, body: unknown): RequestInit {
  return { method, body: JSON.stringify(body) };
}

export const languagesApi = {
  // limit=100 là trần của backend. Một người học hiếm khi vượt quá vài ngôn ngữ,
  // nên trang Languages không cần điều khiển phân trang.
  list: () => apiFetch<Paginated<Language>>("/languages?limit=100"),
  get: (id: string) => apiFetch<Language>(`/languages/${id}`),
  create: (input: LanguageInput) =>
    apiFetch<Language>("/languages", json("POST", input)),
  update: (id: string, input: LanguageInput) =>
    apiFetch<Language>(`/languages/${id}`, json("PATCH", input)),
  remove: (id: string) =>
    apiFetch<void>(`/languages/${id}`, { method: "DELETE" }),
};
