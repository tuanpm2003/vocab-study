"use client";

import dynamic from "next/dynamic";
import { LoadingState } from "@/components/states";

// ssr: false chỉ dùng được trong Client Component, nên cần file trung gian này.
export const VocabularyNewLoader = dynamic(
  () => import("@/components/vocabulary/vocabulary-new"),
  { ssr: false, loading: () => <LoadingState rows={4} /> },
);
