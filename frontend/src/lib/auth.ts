/** Các trang xem được khi CHƯA đăng nhập. Mọi trang khác đều nằm sau AuthGate. */
export const PUBLIC_PATHS = ["/login", "/register"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname);
}

/**
 * Lọc tham số `?next=` (trang để quay lại sau khi đăng nhập).
 *
 * `next` đến từ URL, tức là từ bất kỳ ai gửi link cho người dùng. Nếu chuyển hướng tới nó mà
 * không kiểm tra, link `…/login?next=https://trang-gia-mao.example` sẽ đưa người vừa đăng nhập
 * sang một trang lừa đảo (lỗ hổng "open redirect"). Chỉ chấp nhận đường dẫn NỘI BỘ:
 * bắt đầu bằng đúng một dấu "/", không có "//" hay "/\" (trình duyệt hiểu là tên miền khác).
 */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/")) return "/";
  // KHÔNG tự so chuỗi để đoán trình duyệt hiểu `next` thế nào: bộ phân tích URL bỏ qua tab và
  // xuống dòng, nên "/\t/evil.example" — trông như đường dẫn nội bộ — thực ra là
  // "//evil.example", một tên miền khác. Thay vào đó, đưa cho chính bộ phân tích URL xử lý rồi
  // kiểm tra KẾT QUẢ: origin phải giữ nguyên.
  const base = "http://app.invalid";
  let url: URL;
  try {
    url = new URL(next, base);
  } catch {
    return "/";
  }
  if (url.origin !== base) return "/";
  // Không quay lại chính trang đăng nhập/đăng ký (bỏ dấu "/" cuối để "/login/" cũng bị bắt).
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (isPublicPath(path)) return "/";
  // Trả về dạng ĐÃ chuẩn hóa — thứ trình duyệt thật sự sẽ mở.
  const result = url.pathname + url.search + url.hash;
  // Chuẩn hóa có thể tự sinh ra thứ nguy hiểm: "/.//evil.example" có pathname là
  // "//evil.example". Kiểm tra lại CHÍNH chuỗi sắp trả về, không chỉ chuỗi đầu vào.
  if (result.startsWith("//") || new URL(result, base).origin !== base) {
    return "/";
  }
  return result;
}

export function loginUrl(currentPath: string): string {
  const next = safeNext(currentPath);
  return next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`;
}
