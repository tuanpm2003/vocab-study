"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  completedCount,
  initFlashcards,
  isFinished,
  rate,
  type Rating,
  RATINGS,
  reveal,
} from "@/lib/flashcard-session";
import { formatInterval } from "@/lib/srs-format";
import { useHotkeys } from "@/lib/use-hotkeys";
import { cn } from "@/lib/utils";
import type { Vocabulary } from "@/types/api";

const RELEARN_INTERVALS: Record<Rating, number> = {
  AGAIN: 0,
  HARD: 1,
  GOOD: 1,
  EASY: 1,
};

const RATING_UI: Record<Rating, { label: string; className: string }> = {
  AGAIN: { label: "Quên", className: "border-red-300 bg-red-50 text-red-900" },
  HARD: {
    label: "Khó",
    className: "border-amber-300 bg-amber-50 text-amber-900",
  },
  GOOD: {
    label: "Được",
    className: "border-emerald-300 bg-emerald-50 text-emerald-900",
  },
  EASY: { label: "Dễ", className: "border-sky-300 bg-sky-50 text-sky-900" },
};

function Summary({
  total,
  counts,
  onRestart,
  footer,
}: {
  total: number;
  counts: Record<Rating, number>;
  onRestart: () => void;
  footer?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md text-center" role="status">
      <h2 className="text-2xl font-semibold">Xong phiên học</h2>
      <p className="mt-1 text-muted-foreground">Bạn đã học {total} thẻ.</p>
      <dl className="mt-6 grid grid-cols-4 gap-2">
        {RATINGS.map((rating) => (
          <div
            key={rating}
            className={cn("rounded-xl border p-3", RATING_UI[rating].className)}
          >
            <dt className="text-sm">{RATING_UI[rating].label}</dt>
            <dd className="text-2xl font-semibold">{counts[rating]}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button className="h-11 px-5" onClick={onRestart} autoFocus>
          Học phiên mới
        </Button>
        {footer}
      </div>
    </div>
  );
}

export function FlashcardSession({
  items,
  intervals,
  onReview,
  onRestart,
  summaryFooter,
}: {
  items: Vocabulary[];
  /** Theo id từ: số ngày tới lần ôn kế tiếp nếu chấm từng mức (backend tính sẵn). */
  intervals?: Record<string, Record<Rating, number>>;
  /** Gọi mỗi lần chấm một thẻ. Phiên học không chờ nó xong. */
  onReview?: (vocabulary: Vocabulary, rating: Rating) => void;
  onRestart: () => void;
  summaryFooter?: React.ReactNode;
}) {
  const [state, setState] = useState(() => initFlashcards(items));
  const current = state.queue[0];
  // Thẻ đã bị chấm "Quên" trong phiên này: backend đã đưa nó về vạch xuất phát, nên con số
  // tính sẵn lúc mở phiên không còn đúng — mọi mức "nhớ được" giờ đều là 1 ngày.
  const [forgotten, setForgotten] = useState<ReadonlySet<string>>(new Set());

  function handleRate(rating: Rating) {
    if (!current || !state.revealed) return;
    onReview?.(current, rating);
    if (rating === "AGAIN") {
      setForgotten((ids) => new Set(ids).add(current.id));
    }
    setState((s) => rate(s, rating));
  }

  useHotkeys({
    " ": () => setState(reveal),
    Enter: () => setState(reveal),
    "1": () => handleRate("AGAIN"),
    "2": () => handleRate("HARD"),
    "3": () => handleRate("GOOD"),
    "4": () => handleRate("EASY"),
  });

  if (isFinished(state) || !current) {
    return (
      <Summary
        total={state.total}
        counts={state.counts}
        onRestart={onRestart}
        footer={summaryFooter}
      />
    );
  }

  const preview = forgotten.has(current.id)
    ? RELEARN_INTERVALS
    : intervals?.[current.id];
  const lang = current.language.code ?? undefined;
  const readings = [current.reading, current.romanization].filter(Boolean);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Đã xong {completedCount(state)}/{state.total} · còn {state.queue.length}{" "}
        thẻ trong hàng đợi
      </p>

      <div className="flex min-h-72 flex-col items-center justify-center gap-4 rounded-2xl border p-6 text-center">
        {/* Chữ Hán/Kana cần cỡ lớn hơn hẳn chữ Latin thì mới đọc được nét trên điện thoại. */}
        <p
          lang={lang}
          data-testid="card-term"
          className="text-6xl leading-tight font-medium break-words sm:text-7xl"
        >
          {current.term}
        </p>

        {state.revealed && (
          <div
            data-testid="card-back"
            className="w-full space-y-3 border-t pt-4"
          >
            {readings.length > 0 && (
              <p lang={lang} className="text-xl text-muted-foreground">
                {readings.join(" · ")}
              </p>
            )}
            <p className="text-2xl font-medium">{current.meaning}</p>
            {current.exampleSentence && (
              <div className="rounded-lg bg-muted/50 p-3 text-left">
                <p lang={lang} className="text-lg">
                  {current.exampleSentence}
                </p>
                {current.exampleTranslation && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {current.exampleTranslation}
                  </p>
                )}
              </div>
            )}
            {current.notes && (
              <p className="text-left text-sm whitespace-pre-line text-muted-foreground">
                {current.notes}
              </p>
            )}
          </div>
        )}
      </div>

      {state.revealed ? (
        <div className="grid grid-cols-4 gap-2">
          {RATINGS.map((rating, index) => (
            <button
              key={rating}
              type="button"
              onClick={() => handleRate(rating)}
              className={cn(
                "flex h-20 flex-col items-center justify-center rounded-xl border font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                RATING_UI[rating].className,
              )}
            >
              {RATING_UI[rating].label}
              {preview && (
                <span className="text-xs font-normal">
                  {formatInterval(preview[rating])}
                </span>
              )}
              <kbd className="text-xs font-normal opacity-70">{index + 1}</kbd>
            </button>
          ))}
        </div>
      ) : (
        <Button className="h-16 text-base" onClick={() => setState(reveal)}>
          Hiện đáp án
          <kbd className="ml-2 rounded border border-current/30 px-1.5 text-xs font-normal opacity-80">
            Space
          </kbd>
        </Button>
      )}
    </div>
  );
}
