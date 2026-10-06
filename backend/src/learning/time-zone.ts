// Tính ngày theo múi giờ — ADR-011. Hàm thuần: `now` luôn là tham số, không gọi Date.now().

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function localParts(instant: Date, timeZone: string): LocalParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

/** Múi giờ lệch UTC bao nhiêu mili-giây TẠI thời điểm `instant` (UTC+7 → +25_200_000). */
function offsetMs(instant: Date, timeZone: string): number {
  const p = localParts(instant, timeZone);
  const asUtc = Date.UTC(
    p.year,
    p.month - 1,
    p.day,
    p.hour,
    p.minute,
    p.second,
  );
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** Thời điểm UTC ứng với 00:00 của ngày địa phương (year, month, day). */
function startOfLocalDay(
  year: number,
  month: number,
  day: number,
  timeZone: string,
): Date {
  const midnightAsUtc = Date.UTC(year, month - 1, day);
  // Offset phụ thuộc thời điểm (DST), mà thời điểm lại phụ thuộc offset. Ước lượng một
  // lần rồi tính lại bằng offset tại chính mốc vừa tìm được là đủ hội tụ.
  const guess = new Date(
    midnightAsUtc - offsetMs(new Date(midnightAsUtc), timeZone),
  );
  return new Date(midnightAsUtc - offsetMs(guess, timeZone));
}

/** Ngày địa phương dạng "YYYY-MM-DD". */
export function localDateKey(instant: Date, timeZone: string): string {
  const { year, month, day } = localParts(instant, timeZone);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}`;
}

/**
 * Hai mốc UTC `[start, end)` bao trọn "hôm nay" của `timeZone`.
 * Với Asia/Ho_Chi_Minh: 00:00 giờ Việt Nam = 17:00 UTC của ngày hôm trước.
 */
export function dayRange(
  now: Date,
  timeZone: string,
): { start: Date; end: Date } {
  const { year, month, day } = localParts(now, timeZone);
  return {
    start: startOfLocalDay(year, month, day, timeZone),
    // Date.UTC tự chuẩn hóa ngày tràn (31 + 1 → mùng 1 tháng sau).
    end: startOfLocalDay(year, month, day + 1, timeZone),
  };
}

function previousDay(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number) as [
    number,
    number,
    number,
  ];
  return new Date(Date.UTC(year, month - 1, day - 1))
    .toISOString()
    .slice(0, 10);
}

/**
 * Số ngày học liên tiếp tính tới `today`. `days` là các ngày địa phương có ít nhất một lần ôn.
 * Hôm nay chưa học thì chuỗi vẫn sống nhờ hôm qua — nó chỉ đứt khi bỏ trọn một ngày.
 */
export function countStreak(days: readonly string[], today: string): number {
  const studied = new Set(days);
  let cursor = studied.has(today) ? today : previousDay(today);
  let streak = 0;
  while (studied.has(cursor)) {
    streak += 1;
    cursor = previousDay(cursor);
  }
  return streak;
}
