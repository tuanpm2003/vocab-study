"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ErrorState, LoadingState, NotFoundState } from "@/components/states";
import { buttonVariants } from "@/components/ui/button";
import { VocabularyForm } from "@/components/vocabulary/vocabulary-form";
import { vocabulariesApi } from "@/lib/api";
import { ApiError } from "@/lib/api-client";
import { qk } from "@/lib/query-keys";

export function VocabularyEdit({ id }: { id: string }) {
  const router = useRouter();
  const { data, error, isPending, refetch } = useQuery({
    queryKey: qk.vocabulary(id),
    queryFn: () => vocabulariesApi.get(id),
    retry: (count, e) =>
      !(e instanceof ApiError && e.status === 404) && count < 1,
    // Form lấy giá trị ban đầu MỘT lần. Tự refetch khi quay lại tab sẽ không cập nhật
    // được form mà chỉ gây hiểu nhầm, nên tắt.
    refetchOnWindowFocus: false,
  });

  if (isPending) return <LoadingState rows={4} />;
  if (error instanceof ApiError && error.status === 404) {
    return (
      <NotFoundState
        title="Không tìm thấy từ này"
        action={
          <Link href="/vocabulary" className={buttonVariants()}>
            Về danh sách từ
          </Link>
        }
      />
    );
  }
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <>
      <Link
        href="/vocabulary"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden /> Từ vựng
      </Link>
      <h1 className="mt-2 mb-4 text-2xl font-semibold">Sửa từ</h1>
      {/* key theo updatedAt: sau khi lưu, form được dựng lại từ dữ liệu mới nhất. */}
      <VocabularyForm
        key={data.updatedAt}
        vocabulary={data}
        onSaved={() => router.push("/vocabulary")}
      />
    </>
  );
}
