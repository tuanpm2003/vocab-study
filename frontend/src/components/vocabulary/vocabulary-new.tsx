"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { VocabularyForm } from "@/components/vocabulary/vocabulary-form";
import {
  contextFromParams,
  EMPTY_CONTEXT,
  loadContext,
} from "@/lib/vocabulary-context";

/**
 * Component này CHỈ chạy trên trình duyệt (trang nạp nó bằng `ssr: false`), nên đọc
 * localStorage ngay lúc khởi tạo được mà không gây lệch hydration.
 */
export default function VocabularyNew() {
  const params = useSearchParams();
  // Ưu tiên: URL (bấm "Thêm từ" từ một bài học) → lần dùng trước → trống.
  const [initialContext] = useState(
    () => contextFromParams(params) ?? loadContext() ?? EMPTY_CONTEXT,
  );

  return <VocabularyForm initialContext={initialContext} />;
}
