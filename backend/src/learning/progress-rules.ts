// Cập nhật tiến độ sau một lần ôn.
// - Quy về đúng/sai, bộ đếm, chuỗi đúng liên tiếp: ADR-010.
// - Lịch ôn (SM-2) và trạng thái suy từ lịch ôn: ADR-012, cài đặt ở srs.ts.
// Hàm thuần: không database, không thời gian hệ thống.

import type {
  LearningStatus,
  ReviewRating,
} from '../generated/prisma/enums.js';
import {
  INITIAL_SRS,
  qualityOfAnswer,
  qualityOfRating,
  schedule,
  statusFor,
  type SrsState,
} from './srs.js';

export interface ProgressSnapshot extends SrsState {
  status: LearningStatus;
  reviewCount: number;
  correctCount: number;
  incorrectCount: number;
  correctStreak: number;
}

/** Tiến độ của một từ chưa ôn lần nào (chưa có dòng LearningProgress). */
export const INITIAL_PROGRESS: ProgressSnapshot = {
  ...INITIAL_SRS,
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

export function applyReview(
  current: ProgressSnapshot,
  input: ReviewInput,
): ProgressSnapshot {
  const correct = isCorrectReview(input);
  const quality =
    input.rating !== undefined
      ? qualityOfRating(input.rating)
      : qualityOfAnswer(input.isCorrect);
  const srs = schedule(
    {
      easeFactor: current.easeFactor,
      intervalDays: current.intervalDays,
      repetitions: current.repetitions,
    },
    quality,
  );
  const streakGain = input.rating !== undefined ? STREAK_GAIN[input.rating] : 1;

  return {
    ...srs,
    // Trạng thái không còn là một máy trạng thái riêng: nó chỉ là cách đọc lịch ôn.
    status: statusFor(srs),
    reviewCount: current.reviewCount + 1,
    correctCount: current.correctCount + (correct ? 1 : 0),
    incorrectCount: current.incorrectCount + (correct ? 0 : 1),
    correctStreak: correct ? current.correctStreak + streakGain : 0,
  };
}
