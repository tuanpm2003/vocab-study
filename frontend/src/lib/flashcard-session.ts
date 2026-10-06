// Logic của một phiên flashcard, viết thành hàm thuần (không React, không API):
// vào một state, ra một state mới. Nhờ vậy test được mọi nhánh mà không cần render gì.

export const RATINGS = ["AGAIN", "HARD", "GOOD", "EASY"] as const;
export type Rating = (typeof RATINGS)[number];

export interface FlashcardState<T> {
  /** Thẻ đang học là queue[0]. */
  queue: T[];
  revealed: boolean;
  counts: Record<Rating, number>;
  /** Số thẻ khác nhau của phiên (không tính lần lặp lại do "Again"). */
  total: number;
}

export function initFlashcards<T>(items: T[]): FlashcardState<T> {
  return {
    queue: items,
    revealed: false,
    counts: { AGAIN: 0, HARD: 0, GOOD: 0, EASY: 0 },
    total: items.length,
  };
}

export function reveal<T>(state: FlashcardState<T>): FlashcardState<T> {
  if (state.revealed || state.queue.length === 0) return state;
  return { ...state, revealed: true };
}

export function rate<T>(
  state: FlashcardState<T>,
  rating: Rating,
): FlashcardState<T> {
  const [current, ...rest] = state.queue;
  // Chưa xem đáp án thì chưa được tự chấm — nếu không, bấm nhầm phím số sẽ bỏ qua thẻ.
  if (current === undefined || !state.revealed) return state;
  return {
    ...state,
    // "Again" = chưa thuộc → thẻ quay về CUỐI hàng đợi, sẽ gặp lại trong chính phiên này.
    queue: rating === "AGAIN" ? [...rest, current] : rest,
    revealed: false,
    counts: { ...state.counts, [rating]: state.counts[rating] + 1 },
  };
}

export function isFinished<T>(state: FlashcardState<T>): boolean {
  return state.queue.length === 0;
}

/** Số thẻ đã qua (đã được chấm khác "Again"). */
export function completedCount<T>(state: FlashcardState<T>): number {
  return state.total - state.queue.length;
}
