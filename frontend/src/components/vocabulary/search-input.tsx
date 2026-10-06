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

  useEffect(() => {
    if (text.trim() === value) return;
    // Mỗi lần gõ thêm, effect chạy lại và cleanup hủy hẹn giờ cũ — đó chính là debounce.
    const timer = window.setTimeout(
      () => onChange(text.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [text, value, onChange]);

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
