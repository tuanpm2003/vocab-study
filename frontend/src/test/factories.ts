import type { Progress } from "@/types/api";

/** Tiến độ của một từ chưa ôn lần nào — dùng chung cho dữ liệu giả trong test. */
export const NEW_PROGRESS: Progress = {
  status: "NEW",
  reviewCount: 0,
  correctCount: 0,
  incorrectCount: 0,
  lastReviewedAt: null,
};
