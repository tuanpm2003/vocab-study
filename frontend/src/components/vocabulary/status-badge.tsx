import { STATUS_CLASSES, STATUS_LABELS } from "@/lib/learning-status";
import { formatDue } from "@/lib/srs-format";
import { cn } from "@/lib/utils";
import type { Progress } from "@/types/api";

export function StatusBadge({
  progress,
  showCounts = false,
}: {
  progress: Progress;
  /** Kèm "đã ôn · đúng · sai" bên cạnh nhãn. */
  showCounts?: boolean;
}) {
  // Dữ liệu chỉ có sau khi trình duyệt gọi API, nên đọc đồng hồ ở đây không gây lệch hydration.
  const due = showCounts ? formatDue(progress.dueAt, new Date()) : null;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <span
        className={cn(
          "inline-flex h-5 items-center rounded-full border px-2 text-xs font-medium whitespace-nowrap",
          STATUS_CLASSES[progress.status],
        )}
      >
        {STATUS_LABELS[progress.status]}
      </span>
      {showCounts && progress.reviewCount > 0 && (
        <span className="text-xs whitespace-nowrap text-muted-foreground">
          {progress.reviewCount} lần · {progress.correctCount} đúng ·{" "}
          {progress.incorrectCount} sai
          {due && ` · ${due}`}
        </span>
      )}
    </span>
  );
}
