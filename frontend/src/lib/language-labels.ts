export interface FieldLabels {
  reading: string;
  /** null = ngôn ngữ này không cần ô romanization (đã viết bằng chữ Latin). */
  romanization: string | null;
}

const DEFAULT_LABELS: FieldLabels = {
  reading: "Cách đọc",
  romanization: "Phiên âm Latin",
};

// Cột trong database giống nhau cho mọi ngôn ngữ (ADR-005); chỉ NHÃN hiển thị là khác.
const LABELS_BY_CODE: Record<string, FieldLabels> = {
  ja: { reading: "Kana", romanization: "Romaji" },
  zh: { reading: "Pinyin", romanization: "Pinyin không dấu" },
  ko: { reading: "Phát âm", romanization: "Romaja" },
  en: { reading: "Phiên âm (IPA)", romanization: null },
};

export function fieldLabels(code: string | null | undefined): FieldLabels {
  if (!code) return DEFAULT_LABELS;
  // "zh-CN", "ja-JP" → lấy phần ngôn ngữ.
  const base = code.toLowerCase().split("-")[0] ?? "";
  return LABELS_BY_CODE[base] ?? DEFAULT_LABELS;
}
