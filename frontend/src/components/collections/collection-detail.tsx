"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { VocabularyBrowser } from "@/components/vocabulary/vocabulary-browser";
import { ErrorState, LoadingState, NotFoundState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { collectionsApi } from "@/lib/api";
import { ApiError } from "@/lib/api-client";
import { qk } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { contextToParams } from "@/lib/vocabulary-context";

export function CollectionDetail({ id }: { id: string }) {
  const { data, error, isPending, refetch } = useQuery({
    queryKey: qk.collection(id),
    queryFn: () => collectionsApi.get(id),
    retry: (count, e) =>
      !(e instanceof ApiError && e.status === 404) && count < 1,
  });

  if (isPending) return <LoadingState />;
  if (error instanceof ApiError && error.status === 404) {
    return (
      <NotFoundState
        title="Không tìm thấy bài học này"
        action={
          <Link href="/languages" className={buttonVariants()}>
            Về danh sách ngôn ngữ
          </Link>
        }
      />
    );
  }
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const addHref = `/vocabulary/new?${contextToParams({
    languageId: data.languageId,
    levelId: data.levelId ?? "",
    collectionIds: [data.id],
  })}`;

  return (
    <>
      <Link
        href={`/languages/${data.languageId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden /> {data.language.name}
      </Link>
      <div className="mt-2 mb-6">
        <h1 className="text-2xl font-semibold">{data.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">
            {data.kind === "LESSON" ? "Bài học" : "Chủ đề"}
          </Badge>
          <Badge variant="outline">{data.level?.name ?? "Xuyên level"}</Badge>
          <span>{data.vocabularyCount} từ</span>
        </div>
        {data.description && (
          <p className="mt-3 whitespace-pre-line">{data.description}</p>
        )}
        <Link href={addHref} className={cn(buttonVariants(), "mt-4 h-10 px-4")}>
          <Plus aria-hidden /> Thêm từ vào đây
        </Link>
      </div>
      <Suspense fallback={<LoadingState rows={5} />}>
        <VocabularyBrowser
          fixed={{ languageId: data.languageId, collectionId: data.id }}
          addHref={addHref}
        />
      </Suspense>
    </>
  );
}
