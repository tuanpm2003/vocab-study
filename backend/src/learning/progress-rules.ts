// Quy tắc cập nhật tiến độ sau một lần ôn — ADR-010.
// Hàm thuần: không database, không thời gian hệ thống. Phase 11 thay file này bằng SM-2/FSRS.

import type {
  LearningStatus,
  ReviewRating,
} from '../generated/prisma/enums.js';

export const REVIEW_STREAK = 2;
export const MASTERED_STREAK = 5;

export interface ProgressSnapshot {
  status: LearningStatus;
  reviewCount: number;
  correctCount: number;
  incorrectCount: number;
  correctStreak: number;
}

/** Tiến độ của một từ chưa ôn lần nào (chưa có dòng LearningProgress). */
export const INITIAL_PROGRESS: ProgressSnapshot = {
  status: 'NEW',
  reviewCount: 0,
  correctCount: 0,
  incorrectCount: 0,
  correctStreak: 0,
};

/** Flashcard gửi `rating`, quiz gửi `isCorrect` — đúng một trong hai. */
export type ReviewInput =
  | { rating: ReviewRating; isCorrect?: undefined }
  | { rating?: undefined; isCorrect: boolean };

const RANK: Record<LearningStatus, number> = {
  NEW: 0,
  LEARNING: 1,
  REVIEW: 2,
  MASTERED: 3,
};

// HARD = nhớ ra nhưng chật vật: tính là đúng, nhưng chuỗi không dài thêm.
const STREAK_GAIN: Record<ReviewRating, number> = {
  AGAIN: 0,
  HARD: 0,
  GOOD: 1,
  EASY: 2,
};

export function isCorrectReview(input: ReviewInput): boolean {
  return input.rating !== undefined
    ? input.rating !== 'AGAIN'
    : input.isCorrect;
}

function statusForStreak(streak: number): LearningStatus {
  if (streak >= MASTERED_STREAK) return 'MASTERED';
  if (streak >= REVIEW_STREAK) return 'REVIEW';
  return 'LEARNING';
}

function demote(status: LearningStatus): LearningStatus {
  // Tụt MỘT bậc, không về thẳng LEARNING: một lần bấm nhầm không xóa công sức nhiều tuần.
  if (status === 'MASTERED') return 'REVIEW';
  return 'LEARNING';
}

export function applyReview(
  current: ProgressSnapshot,
  input: ReviewInput,
): ProgressSnapshot {
  const correct = isCorrectReview(input);
  const reviewCount = current.reviewCount + 1;

  if (!correct) {
    return {
      status: demote(current.status),
      reviewCount,
      correctCount: current.correctCount,
      incorrectCount: current.incorrectCount + 1,
      correctStreak: 0,
    };
  }

  const gain = input.rating !== undefined ? STREAK_GAIN[input.rating] : 1;
  const correctStreak = current.correctStreak + gain;
  const earned = statusForStreak(correctStreak);
  return {
    // Trả lời đúng không bao giờ làm tụt bậc.
    status: RANK[earned] > RANK[current.status] ? earned : current.status,
    reviewCount,
    correctCount: current.correctCount + 1,
    incorrectCount: current.incorrectCount,
    correctStreak,
  };
}
