"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  answer,
  initQuiz,
  isQuizFinished,
  next,
  score,
} from "@/lib/quiz-session";
import { useHotkeys } from "@/lib/use-hotkeys";
import { cn } from "@/lib/utils";
import type { QuizItem, Vocabulary } from "@/types/api";

function QuizSummary({
  correct,
  incorrect,
  missed,
  onRestart,
  footer,
}: {
  correct: number;
  incorrect: number;
  missed: QuizItem[];
  onRestart: () => void;
  footer?: React.ReactNode;
}) {
  const total = correct + incorrect;
  return (
    <div className="mx-auto max-w-md" role="status">
      <div className="text-center">
        <h2 className="text-2xl font-semibold">Xong bài trắc nghiệm</h2>
        <p className="mt-1 text-muted-foreground">
          Đúng {correct}/{total} câu
          {total > 0 && ` (${Math.round((correct / total) * 100)}%)`}
        </p>
      </div>
      <dl className="mt-6 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-emerald-900">
          <dt className="text-sm">Đúng</dt>
          <dd className="text-2xl font-semibold">{correct}</dd>
        </div>
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-red-900">
          <dt className="text-sm">Sai</dt>
          <dd className="text-2xl font-semibold">{incorrect}</dd>
        </div>
      </dl>
      {missed.length > 0 && (
        <section className="mt-6" aria-label="Các từ trả lời sai">
          <h3 className="mb-2 font-medium">Cần xem lại</h3>
          <ul className="divide-y rounded-xl border">
            {missed.map((item) => (
              <li
                key={item.vocabulary.id}
                className="flex items-baseline justify-between gap-3 px-3 py-2"
              >
                <span
                  lang={item.vocabulary.language.code ?? undefined}
                  className="text-xl font-medium"
                >
                  {item.vocabulary.term}
                </span>
                <span className="text-right text-sm text-muted-foreground">
                  {item.vocabulary.meaning}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button className="h-11 px-5" onClick={onRestart} autoFocus>
          Làm bài mới
        </Button>
        {footer}
      </div>
    </div>
  );
}

export function QuizSession({
  items,
  onAnswer,
  onRestart,
  summaryFooter,
}: {
  items: QuizItem[];
  /** Gọi mỗi lần trả lời một câu. Phiên học không chờ nó xong. */
  onAnswer?: (vocabulary: Vocabulary, isCorrect: boolean) => void;
  onRestart: () => void;
  summaryFooter?: React.ReactNode;
}) {
  const [state, setState] = useState(() => initQuiz(items));
  const question = state.questions[state.index];
  const answered = state.selected !== null;

  function choose(choiceIndex: number) {
    if (!question || answered || choiceIndex >= question.choices.length) return;
    onAnswer?.(question.vocabulary, choiceIndex === question.correctIndex);
    setState((s) => answer(s, choiceIndex));
  }

  const goNext = () => setState(next);

  useHotkeys({
    "1": () => choose(0),
    "2": () => choose(1),
    "3": () => choose(2),
    "4": () => choose(3),
    " ": goNext,
    Enter: goNext,
  });

  if (isQuizFinished(state) || !question) {
    return (
      <QuizSummary
        {...score(state)}
        onRestart={onRestart}
        footer={summaryFooter}
      />
    );
  }

  const lang = question.vocabulary.language.code ?? undefined;
  const promptIsTerm = question.questionType === "term_to_meaning";
  const isCorrect = state.selected === question.correctIndex;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Câu {state.index + 1}/{state.questions.length}
      </p>

      <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border p-6 text-center">
        <p className="text-sm text-muted-foreground">
          {promptIsTerm ? "Từ này nghĩa là gì?" : "Từ nào có nghĩa này?"}
        </p>
        <p
          data-testid="quiz-prompt"
          lang={promptIsTerm ? lang : undefined}
          className={cn(
            "font-medium break-words",
            promptIsTerm ? "text-6xl leading-tight" : "text-3xl",
          )}
        >
          {question.prompt}
        </p>
      </div>

      <ol className="grid gap-2">
        {question.choices.map((choice, index) => {
          const isAnswer = index === question.correctIndex;
          const isPicked = index === state.selected;
          return (
            <li key={`${state.index}-${index}`}>
              <button
                type="button"
                disabled={answered}
                onClick={() => choose(index)}
                data-state={
                  !answered
                    ? "idle"
                    : isAnswer
                      ? "correct"
                      : isPicked
                        ? "wrong"
                        : "idle"
                }
                className={cn(
                  "flex min-h-14 w-full items-center gap-3 rounded-xl border px-4 py-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  !answered && "hover:border-foreground/40 hover:bg-muted",
                  // Sau khi trả lời: đáp án đúng LUÔN được tô xanh, kể cả khi người học chọn sai.
                  answered &&
                    isAnswer &&
                    "border-emerald-400 bg-emerald-50 text-emerald-900",
                  answered &&
                    isPicked &&
                    !isAnswer &&
                    "border-red-400 bg-red-50 text-red-900",
                  answered && !isAnswer && !isPicked && "opacity-60",
                )}
              >
                <kbd className="flex size-6 shrink-0 items-center justify-center rounded border text-xs">
                  {index + 1}
                </kbd>
                <span
                  lang={promptIsTerm ? undefined : lang}
                  className={cn(
                    "flex-1 break-words",
                    promptIsTerm ? "text-lg" : "text-2xl",
                  )}
                >
                  {choice}
                </span>
                {answered && isAnswer && (
                  <Check className="size-5" aria-hidden />
                )}
                {answered && isPicked && !isAnswer && (
                  <X className="size-5" aria-hidden />
                )}
              </button>
            </li>
          );
        })}
      </ol>

      {answered && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p
            role="status"
            className={cn(
              "font-medium",
              isCorrect ? "text-emerald-700" : "text-red-700",
            )}
          >
            {isCorrect
              ? "Đúng!"
              : `Sai — đáp án đúng: ${question.choices[question.correctIndex] ?? ""}`}
          </p>
          <Button className="h-12 px-5" onClick={goNext} autoFocus>
            Tiếp
            <kbd className="ml-2 rounded border border-current/30 px-1.5 text-xs font-normal opacity-80">
              Space
            </kbd>
          </Button>
        </div>
      )}
    </div>
  );
}
