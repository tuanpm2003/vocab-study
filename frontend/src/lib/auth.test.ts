import { describe, expect, it } from "vitest";
import { isPublicPath, loginUrl, safeNext } from "@/lib/auth";

describe("safeNext — chống open redirect", () => {
  it.each([
    ["/vocabulary", "/vocabulary"],
    [
      "/vocabulary?status=LEARNING&page=2",
      "/vocabulary?status=LEARNING&page=2",
    ],
    ["/languages/abc123", "/languages/abc123"],
    ["/study/session?source=due", "/study/session?source=due"],
  ])("đường dẫn nội bộ %s được giữ nguyên", (input, expected) => {
    expect(safeNext(input)).toBe(expected);
  });

  it.each([
    ["https://trang-gia-mao.example", "URL tuyệt đối"],
    ["http://localhost:3000/vocabulary", "URL tuyệt đối cùng máy"],
    ["//trang-gia-mao.example", "protocol-relative"],
    ["/\\trang-gia-mao.example", "gạch chéo ngược"],
    ["javascript:alert(1)", "javascript:"],
    ["vocabulary", "không bắt đầu bằng /"],
    ["", "rỗng"],
  ])("%s (%s) → về trang chủ", (input) => {
    expect(safeNext(input)).toBe("/");
  });

  it("null / undefined → trang chủ", () => {
    expect(safeNext(null)).toBe("/");
    expect(safeNext(undefined)).toBe("/");
  });

  it("không quay lại chính trang đăng nhập hay đăng ký (tránh vòng lặp)", () => {
    expect(safeNext("/login")).toBe("/");
    expect(safeNext("/login?next=/vocabulary")).toBe("/");
    expect(safeNext("/register")).toBe("/");
  });
});

describe("loginUrl", () => {
  it("kèm trang hiện tại để quay lại sau khi đăng nhập", () => {
    expect(loginUrl("/vocabulary?status=NEW")).toBe(
      "/login?next=%2Fvocabulary%3Fstatus%3DNEW",
    );
  });

  it("đang ở trang chủ thì không cần next", () => {
    expect(loginUrl("/")).toBe("/login");
  });
});

describe("isPublicPath", () => {
  it("chỉ /login và /register là công khai", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/register")).toBe(true);
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/vocabulary")).toBe(false);
    expect(isPublicPath("/login/khac")).toBe(false);
  });
});

describe("safeNext — biến thể mà so chuỗi không bắt được (rà soát bảo mật Phase 12)", () => {
  // Bộ phân tích URL của trình duyệt BỎ QUA tab và xuống dòng, nên các chuỗi dưới đây trông
  // như đường dẫn nội bộ nhưng thực ra trỏ tới một tên miền khác.
  it.each([
    ["/\t/trang-gia-mao.example", "tab giữa hai dấu /"],
    ["/\n/trang-gia-mao.example", "xuống dòng"],
    ["/\r\n/trang-gia-mao.example", "CR LF"],
    [
      "/	" + String.fromCharCode(92) + "trang-gia-mao.example",
      "tab + gạch chéo ngược",
    ],
  ])("%j (%s) → về trang chủ", (input) => {
    expect(safeNext(input)).toBe("/");
  });

  it("giá trị lấy từ query string đã giải mã (%09 = tab) cũng bị chặn", () => {
    const next = new URLSearchParams("next=/%09/trang-gia-mao.example").get(
      "next",
    );
    expect(safeNext(next)).toBe("/");
  });

  it.each([
    ["/%2F%2Ftrang-gia-mao.example"],
    ["/.//trang-gia-mao.example"],
    ["/..//trang-gia-mao.example"],
    ["/@trang-gia-mao.example"],
  ])(
    "%s không đưa ra ngoài app (ở lại trong app, hoặc về trang chủ)",
    (input) => {
      const result = safeNext(input);
      expect(result.startsWith("/")).toBe(true);
      expect(result.startsWith("//")).toBe(false);
      expect(new URL(result, "http://app.test").origin).toBe("http://app.test");
    },
  );

  it.each(["/login/", "/x/../login", "/register/?a=1", "/\tlogin"])(
    "%j là trang đăng nhập/đăng ký trá hình → về trang chủ (tránh vòng lặp)",
    (input) => {
      expect(safeNext(input)).toBe("/");
    },
  );

  it("giữ nguyên query và hash của đường dẫn hợp lệ", () => {
    expect(safeNext("/vocabulary?search=%E9%A3%9F#top")).toBe(
      "/vocabulary?search=%E9%A3%9F#top",
    );
  });
});
