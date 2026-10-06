"use client";

import { useEffect, useRef } from "react";

type Handler = (event: KeyboardEvent) => void;

const TYPING_TAGS = ["INPUT", "TEXTAREA", "SELECT"];
const ACTIVATION_KEYS = ["Enter", " "];

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
      if (target instanceof HTMLElement) {
        if (target.isContentEditable || TYPING_TAGS.includes(target.tagName)) {
          return;
        }
        // Enter/Space trên một nút hay link đang focus là để BẤM chính nó. Nếu phím tắt
        // chen vào và preventDefault, nút "Học phiên mới" hay link trên thanh điều hướng
        // sẽ không phản hồi bàn phím nữa.
        if (
          ACTIVATION_KEYS.includes(event.key) &&
          target.closest("button, a[href], [role='button']")
        ) {
          return;
        }
      }
      const handler = latest.current[event.key];
      if (!handler) return;
      // Space mặc định cuộn trang — giữa phiên học thì đó là phá đám.
      event.preventDefault();
      handler(event);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
