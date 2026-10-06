"use client";

import { useEffect, useRef } from "react";

type Handler = (event: KeyboardEvent) => void;

/**
 * Phím tắt toàn trang. `bindings` map từ `event.key` (ví dụ " ", "1", "Enter") sang hàm xử lý.
 * Bỏ qua khi người dùng đang gõ trong ô nhập, hoặc đang giữ Ctrl/Alt/Cmd (phím tắt của trình duyệt).
 */
export function useHotkeys(bindings: Record<string, Handler>): void {
  // Ref giữ bindings mới nhất: listener chỉ đăng ký MỘT lần nhưng luôn gọi đúng hàm hiện tại.
  const latest = useRef(bindings);
  useEffect(() => {
    latest.current = bindings;
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }
      const handler = latest.current[event.key];
      if (!handler) return;
      // Space mặc định cuộn trang và "bấm" nút đang focus — cả hai đều phá phiên học.
      event.preventDefault();
      handler(event);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
