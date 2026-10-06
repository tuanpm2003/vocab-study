"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { buttonVariants } from "@/components/ui/button";
import { FlashcardSession } from "@/components/study/flashcard-session";
import { learningApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import type { SessionParams, StudyMode } from "@/types/api";

function parseParams(params: URLSearchParams): SessionParams {
  const limit = Number(params.get("limit"));
  const mode: StudyMode = "flashcard";
  return {
    mode,
    languageId: params.get("languageId") ?? "",
    levelId: params.get("levelId") ?? "",
    collectionId: params.get("collectionId") ?? "",
    limit: Number.isInteger(limit) && limit >= 1 && limit <= 100 ? limit : 20,
  };
}

export function StudySession() {
  const searchParams = useSearchParams();
  const params = parseParams(searchParams);
  // Tăng `round` = xin một bộ từ ngẫu nhiên mới cho cùng phạm vi.
  const [round, setRound] = useState(0);

  const session = useQuery({
    queryKey: qk.session(params, round),
    queryFn: () => learningApi.session(params),
    // Bộ thẻ của một phiên phải ĐỨNG YÊN: backend trả thứ tự ngẫu nhiên, nên bất kỳ lần
    // refetch nào (quay lại tab, mạng chập chờn) cũng sẽ đổi thẻ ngay giữa phiên.
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const backLink = (
    <Link
      href="/study"
      className={cn(buttonVariants({ variant: "outline" }), "h-11 px-5")}
    >
      Chọn phạm vi khác
    </Link>
  );

  if (session.isPending) return <LoadingState rows={3} />;
  if (session.error) {
    return (
      <ErrorState
        error={session.error}
        onRetry={() => void session.refetch()}
      />
    );
  }
  if (session.data.items.length === 0) {
    return (
      <EmptyState
        title="Không có từ nào trong phạm vi này"
        description="Thêm từ vào bài học, hoặc chọn một phạm vi rộng hơn."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link
              href="/vocabulary/new"
              className={cn(buttonVariants(), "h-11 px-5")}
            >
              Thêm từ
            </Link>
            {backLink}
          </div>
        }
      />
    );
  }

  return (
    <FlashcardSession
      // key: phiên mới = component mới, mọi state của phiên cũ bị bỏ.
      key={round}
      items={session.data.items.map((item) => item.vocabulary)}
      onRestart={() => setRound((r) => r + 1)}
      summaryFooter={backLink}
    />
  );
}
