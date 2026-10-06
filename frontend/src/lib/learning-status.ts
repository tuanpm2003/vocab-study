import type { LearningStatus } from "@/types/api";

export const STATUS_LABELS: Record<LearningStatus, string> = {
  NEW: "Mới",
  LEARNING: "Đang học",
  REVIEW: "Ôn tập",
  MASTERED: "Đã thuộc",
};

export const STATUS_CLASSES: Record<LearningStatus, string> = {
  NEW: "border-slate-300 bg-slate-50 text-slate-700",
  LEARNING: "border-amber-300 bg-amber-50 text-amber-900",
  REVIEW: "border-sky-300 bg-sky-50 text-sky-900",
  MASTERED: "border-emerald-300 bg-emerald-50 text-emerald-900",
};
