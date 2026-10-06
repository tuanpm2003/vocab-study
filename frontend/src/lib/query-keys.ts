// Query key tập trung một chỗ: invalidate bằng hằng số thì không gõ sai chính tả được.
// Key ngắn là tiền tố của key dài: invalidate `qk.languages` cũng làm mới mọi `qk.language(id)`.
export const qk = {
  health: ["health"] as const,
  languages: ["languages"] as const,
  language: (id: string) => ["languages", id] as const,
  collections: ["collections"] as const,
  collectionsByLanguage: (languageId: string) =>
    ["collections", "by-language", languageId] as const,
  collection: (id: string) => ["collections", "detail", id] as const,
};
