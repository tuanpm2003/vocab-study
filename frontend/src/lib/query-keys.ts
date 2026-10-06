// Query key tập trung một chỗ: invalidate bằng hằng số thì không gõ sai chính tả được.
export const qk = {
  health: ["health"] as const,
  languages: ["languages"] as const,
  language: (id: string) => ["languages", id] as const,
};
