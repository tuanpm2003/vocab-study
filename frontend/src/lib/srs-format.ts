// Diễn đạt lịch ôn (ADR-012) cho người đọc. Backend tính lịch; ở đây chỉ đổi số thành chữ.

const DAY_MS = 86_400_000;

/** Khoảng cách ôn kế tiếp, hiện dưới mỗi nút chấm: "ngay", "1 ngày", "15 ngày", "~3 tháng". */
export function formatInterval(days: number): string {
  if (days <= 0) return "ngay";
  if (days < 30) return `${days} ngày`;
  if (days < 365) return `~${Math.round(days / 30)} tháng`;
  return "1 năm";
}

function startOfLocalDay(date: Date): number {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}

/**
 * Khi nào tới lượt ôn lại, tính theo NGÀY trên lịch (không theo số giờ): hạn ôn lúc 00:00
 * ngày mai thì dù bây giờ là 9 giờ sáng hay 11 giờ đêm đều là "ngày mai".
 * Trả `null` cho từ chưa ôn lần nào (chưa có lịch).
 */
export function formatDue(dueAt: string | null, now: Date): string | null {
  if (dueAt === null) return null;
  const due = new Date(dueAt);
  if (due.getTime() <= now.getTime()) return "Đến hạn ôn";
  const days = Math.round(
    (startOfLocalDay(due) - startOfLocalDay(now)) / DAY_MS,
  );
  if (days <= 0) return "Ôn lại hôm nay";
  if (days === 1) return "Ôn lại ngày mai";
  return `Ôn lại sau ${days} ngày`;
}
