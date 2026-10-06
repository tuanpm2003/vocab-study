/** Ngữ cảnh nhập từ: thứ được GIỮ LẠI giữa các lần lưu và giữa các lần mở trang. */
export interface VocabularyContext {
  languageId: string;
  /** "" = không chọn level. */
  levelId: string;
  collectionIds: string[];
}

export const EMPTY_CONTEXT: VocabularyContext = {
  languageId: "",
  levelId: "",
  collectionIds: [],
};

const STORAGE_KEY = "vocabulary:last-context";

function isContext(value: unknown): value is VocabularyContext {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.languageId === "string" &&
    typeof v.levelId === "string" &&
    Array.isArray(v.collectionIds) &&
    v.collectionIds.every((id) => typeof id === "string")
  );
}

export function loadContext(): VocabularyContext | null {
  // localStorage có thể bị chặn (chế độ riêng tư) hoặc chứa dữ liệu cũ sai định dạng.
  // Ngữ cảnh chỉ là tiện ích — hỏng thì bỏ qua, không được làm sập form.
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isContext(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveContext(context: VocabularyContext): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(context));
  } catch {
    // Không lưu được thì thôi: lần sau người dùng chọn lại.
  }
}

/** Ngữ cảnh truyền qua URL — ví dụ bấm "Thêm từ" từ trang một bài học. */
export function contextFromParams(
  params: URLSearchParams,
): VocabularyContext | null {
  const languageId = params.get("languageId");
  if (!languageId) return null;
  const collectionId = params.get("collectionId");
  return {
    languageId,
    levelId: params.get("levelId") ?? "",
    collectionIds: collectionId ? [collectionId] : [],
  };
}

export function contextToParams(context: VocabularyContext): string {
  const params = new URLSearchParams({ languageId: context.languageId });
  if (context.levelId) params.set("levelId", context.levelId);
  const [collectionId] = context.collectionIds;
  if (collectionId) params.set("collectionId", collectionId);
  return params.toString();
}
