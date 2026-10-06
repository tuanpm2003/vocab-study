"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { ErrorState, LoadingState, NotFoundState } from "@/components/states";
import { buttonVariants } from "@/components/ui/button";
import { languagesApi } from "@/lib/api";
import { ApiError } from "@/lib/api-client";
import { qk } from "@/lib/query-keys";

export function LanguageDetail({ id }: { id: string }) {
  const { data, error, isPending, refetch } = useQuery({
    queryKey: qk.language(id),
    queryFn: () => languagesApi.get(id),
    // 404 là câu trả lời dứt khoát, thử lại chỉ làm chậm việc báo cho người dùng.
    retry: (count, e) =>
      !(e instanceof ApiError && e.status === 404) && count < 1,
  });

  const back = (
    <Link
      href="/languages"
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ChevronLeft className="size-4" aria-hidden /> Ngôn ngữ
    </Link>
  );

  if (isPending) return <LoadingState />;
  if (error instanceof ApiError && error.status === 404) {
    return (
      <NotFoundState
        title="Không tìm thấy ngôn ngữ này"
        action={
          <Link href="/languages" className={buttonVariants()}>
            Về danh sách ngôn ngữ
          </Link>
        }
      />
    );
  }
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <>
      {back}
      <div className="mt-2 mb-6">
        <h1 className="text-2xl font-semibold">{data.name}</h1>
        <p className="text-sm text-muted-foreground">
          {data.vocabularyCount} từ{data.code && ` · ${data.code}`}
        </p>
      </div>
    </>
  );
}
