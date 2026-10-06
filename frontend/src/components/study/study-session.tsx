"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { FlashcardSession } from "@/components/study/flashcard-session";
import { QuizSession } from "@/components/study/quiz-session";
import { buttonVariants } from "@/components/ui/button";
import { learningApi } from "@/lib/api";
import { ApiError } from "@/lib/api-client";
import { qk } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { isQuizItem, type SessionParams } from "@/types/api";

function parseParams(params: URLSearchParams): SessionParams {
  const limit = Number(params.get("limit"));
  return {
    mode:
      params.get("mode") === "multiple_choice"
        ? "multiple_choice"
        : "flashcard",
    questionType:
      params.get("questionType") === "meaning_to_term"
        ? "meaning_to_term"
        : "term_to_meaning",
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
    // 400 = "chưa đủ từ để làm trắc nghiệm": thử lại cũng không khác.
    retry: (count, e) =>
      !(e instanceof ApiError && e.status === 400) && count < 1,
  });

  const backLink = (
    <Link
      href="/study"
      className={cn(buttonVariants({ variant: "outline" }), "h-11 px-5")}
    >
      Chọn phạm vi khác
    </Link>
  );
  const restart = () => setRound((r) => r + 1);

  if (session.isPending) return <LoadingState rows={3} />;
  if (session.error instanceof ApiError && session.error.status === 400) {
    return (
      <EmptyState
        title="Chưa làm trắc nghiệm được"
        description={session.error.message}
        action={backLink}
      />
    );
  }
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

  if (params.mode === "multiple_choice") {
    return (
      <QuizSession
        key={round}
        items={session.data.items.filter(isQuizItem)}
        onRestart={restart}
        summaryFooter={backLink}
      />
    );
  }

  return (
    <FlashcardSession
      // key: phiên mới = component mới, mọi state của phiên cũ bị bỏ.
      key={round}
      items={session.data.items.map((item) => item.vocabulary)}
      onRestart={restart}
      summaryFooter={backLink}
    />
  );
}
