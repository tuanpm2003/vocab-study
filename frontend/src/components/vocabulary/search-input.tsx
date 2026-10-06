"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

export const SEARCH_DEBOUNCE_MS = 300;

/**
 * Ô tìm kiếm có debounce: chỉ báo ra ngoài khi người dùng NGỪNG gõ 300ms.
 * Gõ "taberu" nhanh → một request, không phải sáu.
 */
export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState(value);
  // `emitted`: giá trị chính ô này vừa báo ra. `seen`: giá trị `value` của lần render trước.
  const [emitted, setEmitted] = useState(value);
  const [seen, setSeen] = useState(value);

  // `value` đổi có hai nguồn: (1) dội lại từ chính lần debounce của ô này — KHÔNG được đụng
  // vào `text`, vì người dùng có thể đã gõ thêm; (2) từ bên ngoài (nút Back, "Xóa bộ lọc")
  // — phải chép vào ô. Không dùng `key` để dựng lại ô: remount làm mất focus giữa lúc đang gõ.
  if (value !== seen) {
    setSeen(value);
    if (value !== emitted) {
      setText(value);
      setEmitted(value);
    }
  }

  useEffect(() => {
    const next = text.trim();
    if (next === emitted) return;
    // Mỗi lần gõ thêm, effect chạy lại và cleanup hủy hẹn giờ cũ — đó chính là debounce.
    const timer = window.setTimeout(() => {
      setEmitted(next);
      onChange(next);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [text, emitted, onChange]);

  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        aria-label="Tìm từ"
        placeholder={placeholder ?? "Tìm theo từ, nghĩa, cách đọc…"}
        className="h-9 pl-8"
        maxLength={100}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
    </div>
  );
}
