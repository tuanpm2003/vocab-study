import { describe, expect, it } from "vitest";
import { formatDue, formatInterval } from "@/lib/srs-format";

describe("formatInterval", () => {
  it.each([
    [0, "ngay"],
    [1, "1 ngày"],
    [6, "6 ngày"],
    [15, "15 ngày"],
    [29, "29 ngày"],
    [30, "~1 tháng"],
    [38, "~1 tháng"],
    [95, "~3 tháng"],
    [364, "~12 tháng"],
    [365, "1 năm"],
  ])("%i ngày → %s", (days, expected) => {
    expect(formatInterval(days)).toBe(expected);
  });
});

describe("formatDue", () => {
  // Dựng thời điểm theo giờ ĐỊA PHƯƠNG của máy chạy test, nên kết quả không phụ thuộc múi giờ.
  const local = (day: number, hour = 0, minute = 0) =>
    new Date(2026, 9, day, hour, minute);
  const now = local(6, 9, 0);

  it("từ chưa ôn lần nào (chưa có lịch) → null", () => {
    expect(formatDue(null, now)).toBeNull();
  });

  it("hạn đã qua hoặc đúng bây giờ → Đến hạn ôn", () => {
    expect(formatDue(local(5).toISOString(), now)).toBe("Đến hạn ôn");
    expect(formatDue(local(6, 0, 0).toISOString(), now)).toBe("Đến hạn ôn");
    expect(formatDue(now.toISOString(), now)).toBe("Đến hạn ôn");
  });

  it("hạn là 00:00 ngày mai → “ngày mai”, dù bây giờ là sáng sớm hay đêm khuya", () => {
    const tomorrow = local(7).toISOString();
    expect(formatDue(tomorrow, local(6, 0, 30))).toBe("Ôn lại ngày mai");
    expect(formatDue(tomorrow, local(6, 23, 59))).toBe("Ôn lại ngày mai");
  });

  it("hạn muộn hơn trong chính hôm nay → hôm nay", () => {
    expect(formatDue(local(6, 18, 0).toISOString(), now)).toBe(
      "Ôn lại hôm nay",
    );
  });

  it("nhiều ngày nữa → đếm theo ngày trên lịch", () => {
    expect(formatDue(local(12).toISOString(), now)).toBe("Ôn lại sau 6 ngày");
    expect(formatDue(local(21).toISOString(), now)).toBe("Ôn lại sau 15 ngày");
  });
});
