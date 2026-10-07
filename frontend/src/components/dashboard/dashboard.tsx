"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Flame,
  GraduationCap,
  Plus,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { ErrorState, LoadingState } from "@/components/states";
import { buttonVariants } from "@/components/ui/button";
import { learningApi } from "@/lib/api";
import { STATUS_CLASSES, STATUS_LABELS } from "@/lib/learning-status";
import { qk } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import {
  LEARNING_STATUSES,
  type LearningStatus,
  type Stats,
} from "@/types/api";

function GettingStarted({ stats }: { stats: Stats }) {
  const hasLanguage = stats.totals.languages > 0;
  const steps = [
    {
      done: hasLanguage,
      title: "Thêm ngôn ngữ bạn đang học",
      href: "/languages",
      action: "Thêm ngôn ngữ",
    },
    {
      done: false,
      title: "Thêm vài từ đầu tiên — chỉ cần từ và nghĩa",
      href: "/vocabulary/new",
      action: "Thêm từ",
    },
    {
      done: false,
      title: "Học bằng flashcard hoặc trắc nghiệm",
      href: "/study",
      action: "Học",
    },
  ];
  // Bước đầu tiên chưa xong là việc cần làm tiếp theo — chỉ nó có nút.
  const nextIndex = steps.findIndex((step) => !step.done);

  return (
    <section className="mx-auto max-w-xl" aria-label="Bắt đầu">
      <h1 className="text-2xl font-semibold">Chào mừng</h1>
      <p className="mt-1 text-muted-foreground">
        Ba bước để bắt đầu ghi nhớ từ vựng.
      </p>
      <ol className="mt-6 space-y-3">
        {steps.map((step, index) => (
          <li
            key={step.href}
            aria-current={index === nextIndex ? "step" : undefined}
            className={cn(
              "flex flex-wrap items-center gap-3 rounded-xl border p-4",
              index === nextIndex && "border-primary bg-muted/40",
              index > nextIndex && "opacity-60",
            )}
          >
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-medium",
                step.done &&
                  "border-emerald-400 bg-emerald-50 text-emerald-800",
              )}
            >
              {step.done ? "✓" : index + 1}
            </span>
            <span className="min-w-0 flex-1 font-medium">{step.title}</span>
            {index === nextIndex && (
              <Link
                href={step.href}
                className={cn(buttonVariants(), "h-11 px-5")}
              >
                {step.action}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

function ActionCard({
  href,
  icon: Icon,
  title,
  subtitle,
  primary = false,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "pressable flex min-h-20 items-center gap-3 rounded-xl border p-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        primary
          ? "border-primary bg-primary text-primary-foreground hover:bg-primary/80"
          : "hover:border-foreground/30 hover:bg-muted",
      )}
    >
      <Icon className="size-6 shrink-0" aria-hidden />
      <span className="min-w-0">
        <span className="block text-lg leading-tight font-semibold">
          {title}
        </span>
        <span className={cn("text-sm", !primary && "text-muted-foreground")}>
          {subtitle}
        </span>
      </span>
    </Link>
  );
}

function Figure({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border p-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

const STATUS_COUNT_KEY: Record<
  LearningStatus,
  "new" | "learning" | "review" | "mastered"
> = {
  NEW: "new",
  LEARNING: "learning",
  REVIEW: "review",
  MASTERED: "mastered",
};

export function Dashboard() {
  const { data, error, isPending, refetch } = useQuery({
    queryKey: qk.stats,
    queryFn: learningApi.stats,
    // Số liệu đổi sau mỗi lần thêm từ hay học một phiên: quay lại trang chủ là phải thấy số mới.
    staleTime: 0,
  });

  if (isPending) return <LoadingState rows={4} />;
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (data.totals.vocabulary === 0) return <GettingStarted stats={data} />;

  const { today, totals } = data;
  const hasDue = data.dueCount > 0;

  return (
    <div className="space-y-8">
      <section
        aria-label="Hành động chính"
        className="grid gap-3 sm:grid-cols-3"
      >
        <ActionCard
          href="/study/session?source=due"
          icon={RotateCcw}
          title="Ôn tập"
          subtitle={
            hasDue
              ? `${data.dueCount} từ đến hạn ôn`
              : "Hôm nay đã ôn hết — quay lại ngày mai"
          }
          primary={hasDue}
        />
        <ActionCard
          href="/vocabulary/new"
          icon={Plus}
          title="Thêm từ"
          subtitle="Nhập nhanh, không rời bàn phím"
          primary={!hasDue}
        />
        <ActionCard
          href="/study"
          icon={GraduationCap}
          title="Học"
          subtitle="Flashcard hoặc trắc nghiệm"
        />
      </section>

      <section aria-labelledby="today-heading">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="today-heading" className="text-lg font-semibold">
            Hôm nay
          </h2>
          <p className="inline-flex items-center gap-1.5 text-sm">
            <Flame
              className={cn(
                "size-4",
                data.streak > 0 ? "text-orange-500" : "text-muted-foreground",
              )}
              aria-hidden
            />
            {data.streak > 0
              ? `Chuỗi ${data.streak} ngày liên tiếp`
              : "Chưa có chuỗi ngày học"}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Figure label="Đã ôn" value={today.reviewed} />
          <Figure label="Đúng" value={today.correct} />
          <Figure label="Sai" value={today.incorrect} />
          <Figure
            label="Tỷ lệ đúng"
            value={
              today.accuracy === null
                ? "—"
                : `${Math.round(today.accuracy * 100)}%`
            }
          />
        </dl>
        {data.byLanguage.length > 0 ? (
          <ul className="mt-3 divide-y rounded-xl border text-sm">
            {data.byLanguage.map((row) => (
              <li
                key={row.languageId}
                className="flex items-center justify-between gap-3 px-3 py-2"
              >
                <span className="font-medium">{row.name}</span>
                <span className="text-muted-foreground tabular-nums">
                  {row.reviewed} lượt · {row.correct} đúng · {row.incorrect} sai
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Hôm nay bạn chưa ôn từ nào.
          </p>
        )}
      </section>

      <section aria-labelledby="totals-heading">
        <h2 id="totals-heading" className="mb-3 text-lg font-semibold">
          Kho từ · {totals.vocabulary} từ
        </h2>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {LEARNING_STATUSES.map((status) => (
            <li key={status}>
              <Link
                href={`/vocabulary?status=${status}`}
                className={cn(
                  "pressable block rounded-xl border p-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  STATUS_CLASSES[status],
                )}
              >
                <span className="block text-sm">{STATUS_LABELS[status]}</span>
                <span className="text-2xl font-semibold tabular-nums">
                  {totals[STATUS_COUNT_KEY[status]]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
