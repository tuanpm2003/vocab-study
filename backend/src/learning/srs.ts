// Spaced Repetition theo SM-2 — ADR-012.
// Hàm thuần: không database, không đồng hồ. Vào một trạng thái + một điểm, ra trạng thái mới.

import type {
  LearningStatus,
  ReviewRating,
} from '../generated/prisma/enums.js';

export interface SrsState {
  /** "Hệ số dễ": lần sau cách lần này gấp bao nhiêu lần. Càng hay quên thì càng nhỏ. */
  easeFactor: number;
  /** Số ngày tới lần ôn kế tiếp. 0 = đến hạn ngay. */
  intervalDays: number;
  /** Số lần trả lời được LIÊN TIẾP. Về 0 mỗi khi quên. */
  repetitions: number;
}

export const INITIAL_SRS: SrsState = {
  easeFactor: 2.5,
  intervalDays: 0,
  repetitions: 0,
};

export const MIN_EASE_FACTOR = 1.3;
export const FIRST_INTERVAL_DAYS = 1;
export const SECOND_INTERVAL_DAYS = 6;
export const MAX_INTERVAL_DAYS = 365;
/** Từ có khoảng cách ôn từ ngưỡng này trở lên được coi là đã thuộc. */
export const MATURE_INTERVAL_DAYS = 21;

/** Điểm chất lượng của SM-2 (thang 0–5). Dưới 3 nghĩa là không nhớ ra. */
export type Quality = 1 | 3 | 4 | 5;

const QUALITY_BY_RATING: Record<ReviewRating, Quality> = {
  AGAIN: 1,
  HARD: 3,
  GOOD: 4,
  EASY: 5,
};

export function qualityOfRating(rating: ReviewRating): Quality {
  return QUALITY_BY_RATING[rating];
}

/** Quiz chỉ biết đúng/sai: đúng tính như GOOD, sai tính như AGAIN. */
export function qualityOfAnswer(isCorrect: boolean): Quality {
  return isCorrect ? 4 : 1;
}

function nextEaseFactor(easeFactor: number, quality: Quality): number {
  const miss = 5 - quality;
  const next = easeFactor + (0.1 - miss * (0.08 + miss * 0.02));
  // Làm tròn 2 chữ số: cộng trừ số thực nhiều lần sẽ ra 2.5000000000000004.
  return Math.max(MIN_EASE_FACTOR, Math.round(next * 100) / 100);
}

export function schedule(state: SrsState, quality: Quality): SrsState {
  const easeFactor = nextEaseFactor(state.easeFactor, quality);

  if (quality < 3) {
    // Quên: học lại từ đầu và đến hạn ngay. easeFactor vẫn giảm — từ này "khó" hơn ta tưởng.
    return { easeFactor, intervalDays: 0, repetitions: 0 };
  }

  let intervalDays: number;
  if (state.repetitions === 0) {
    intervalDays = FIRST_INTERVAL_DAYS;
  } else if (state.repetitions === 1) {
    intervalDays = SECOND_INTERVAL_DAYS;
  } else {
    // Dùng easeFactor MỚI: lần ôn vừa rồi phải ảnh hưởng ngay tới khoảng cách kế tiếp.
    intervalDays = Math.round(state.intervalDays * easeFactor);
  }
  return {
    easeFactor,
    intervalDays: Math.min(MAX_INTERVAL_DAYS, Math.max(1, intervalDays)),
    repetitions: state.repetitions + 1,
  };
}

/** Trạng thái của một từ ĐÃ ôn ít nhất một lần. Từ chưa ôn là NEW và không đi qua hàm này. */
export function statusFor(state: SrsState): LearningStatus {
  if (state.repetitions === 0) return 'LEARNING';
  if (state.intervalDays >= MATURE_INTERVAL_DAYS) return 'MASTERED';
  return 'REVIEW';
}

/** Khoảng cách ôn kế tiếp nếu chấm từng mức — để giao diện báo trước cho người học. */
export function previewIntervals(
  state: SrsState,
): Record<ReviewRating, number> {
  return {
    AGAIN: schedule(state, QUALITY_BY_RATING.AGAIN).intervalDays,
    HARD: schedule(state, QUALITY_BY_RATING.HARD).intervalDays,
    GOOD: schedule(state, QUALITY_BY_RATING.GOOD).intervalDays,
    EASY: schedule(state, QUALITY_BY_RATING.EASY).intervalDays,
  };
}
