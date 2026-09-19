"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiFetch } from "@/lib/api-client";

interface Health {
  status: "ok" | "error";
  database: "connected" | "disconnected";
  timestamp: string;
}

type View = {
  tone: "ok" | "warn" | "error";
  backend: string;
  database: string;
  hint?: string;
};

function toView(data: Health | undefined, error: Error | null): View {
  if (data) return { tone: "ok", backend: "ok", database: data.database };

  if (error instanceof ApiError && error.isNetworkError) {
    return {
      tone: "error",
      backend: "không phản hồi",
      database: "không rõ",
      hint: "Chạy backend: cd backend; npm run start:dev",
    };
  }

  // 503 từ /health nghĩa là backend vẫn sống, chỉ database là không tới được.
  if (error instanceof ApiError && error.status === 503) {
    return {
      tone: "warn",
      backend: "ok",
      database: "disconnected",
      hint: "Chạy database: docker compose up -d (ở thư mục gốc dự án)",
    };
  }

  return {
    tone: "error",
    backend: "lỗi",
    database: "không rõ",
    hint: error?.message,
  };
}

const toneClass: Record<View["tone"], string> = {
  ok: "border-emerald-300 bg-emerald-50 text-emerald-900",
  warn: "border-amber-300 bg-amber-50 text-amber-900",
  error: "border-red-300 bg-red-50 text-red-900",
};

export function HealthStatus() {
  const { data, error, isPending, refetch, isFetching } = useQuery({
    queryKey: ["health"],
    queryFn: () => apiFetch<Health>("/health"),
    retry: false,
  });

  if (isPending) {
    return (
      <p className="text-sm text-muted-foreground">Đang kiểm tra kết nối…</p>
    );
  }

  const view = toView(data, error);

  return (
    <div
      className={`rounded-lg border p-4 ${toneClass[view.tone]}`}
      role="status"
    >
      <p className="font-medium">
        Backend: {view.backend} · DB: {view.database}
      </p>
      {view.hint && <p className="mt-1 text-sm">{view.hint}</p>}
      <button
        type="button"
        onClick={() => void refetch()}
        disabled={isFetching}
        className="mt-3 text-sm underline disabled:opacity-50"
      >
        {isFetching ? "Đang kiểm tra…" : "Kiểm tra lại"}
      </button>
    </div>
  );
}
