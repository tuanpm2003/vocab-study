// Query key tập trung một chỗ: invalidate bằng hằng số thì không gõ sai chính tả được.
// Key ngắn là tiền tố của key dài: invalidate `qk.languages` cũng làm mới mọi `qk.language(id)`.
export const qk = {
  me: ["auth", "me"] as const,
  languages: ["languages"] as const,
  language: (id: string) => ["languages", id] as const,
  collections: ["collections"] as const,
  collectionsByLanguage: (languageId: string) =>
    ["collections", "by-language", languageId] as const,
  collection: (id: string) => ["collections", "detail", id] as const,
  vocabularies: ["vocabularies"] as const,
  vocabularyList: (query: object) => ["vocabularies", "list", query] as const,
  vocabulary: (id: string) => ["vocabularies", "detail", id] as const,
  // Gốc "study-session" tách hẳn khỏi "learning": ghi một lần ôn sẽ invalidate "learning",
  // và bộ thẻ của phiên đang học tuyệt đối không được refetch theo.
  session: (params: object, round: number) =>
    ["study-session", params, round] as const,
  learning: ["learning"] as const,
  stats: ["learning", "stats"] as const,
};
