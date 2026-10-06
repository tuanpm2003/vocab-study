"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { NativeSelect } from "@/components/native-select";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/vocabulary/status-badge";
import { SearchInput } from "@/components/vocabulary/search-input";
import { collectionsApi, languagesApi, vocabulariesApi } from "@/lib/api";
import { STATUS_LABELS } from "@/lib/learning-status";
import { qk } from "@/lib/query-keys";
import { useVocabularyQuery } from "@/lib/use-vocabulary-query";
import { cn } from "@/lib/utils";
import {
  LEARNING_STATUSES,
  type LearningStatus,
  type Vocabulary,
  type VocabularyQuery,
  type VocabularySort,
} from "@/types/api";

const SORT_LABELS: Record<VocabularySort, string> = {
  "createdAt:desc": "Mới thêm trước",
  "createdAt:asc": "Cũ nhất trước",
  "updatedAt:desc": "Mới sửa trước",
  "term:asc": "Từ A → Z",
  "term:desc": "Từ Z → A",
};

function RowActions({
  vocabulary,
  onDelete,
}: {
  vocabulary: Vocabulary;
  onDelete: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center">
      <Link
        href={`/vocabulary/${vocabulary.id}/edit`}
        aria-label={`Sửa ${vocabulary.term}`}
        className={buttonVariants({ variant: "ghost", size: "icon-lg" })}
      >
        <Pencil aria-hidden />
      </Link>
      <Button
        variant="ghost"
        size="icon-lg"
        className="text-destructive"
        aria-label={`Xóa ${vocabulary.term}`}
        onClick={onDelete}
      >
        <Trash2 aria-hidden />
      </Button>
    </div>
  );
}

function Tags({ vocabulary }: { vocabulary: Vocabulary }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <StatusBadge progress={vocabulary.progress} showCounts />
      {vocabulary.level && (
        <Badge variant="outline">{vocabulary.level.name}</Badge>
      )}
      {vocabulary.collections.map((c) => (
        <Badge key={c.id} variant="secondary">
          {c.name}
        </Badge>
      ))}
    </div>
  );
}

function Reading({ vocabulary }: { vocabulary: Vocabulary }) {
  const parts = [vocabulary.reading, vocabulary.romanization].filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <span className="text-sm text-muted-foreground">{parts.join(" · ")}</span>
  );
}

/**
 * Danh sách từ vựng có tìm kiếm / lọc / sắp xếp / phân trang.
 * `fixed` khóa một phần bộ lọc — trang bài học dùng `{ languageId, collectionId }`.
 */
export function VocabularyBrowser({
  fixed,
  addHref = "/vocabulary/new",
}: {
  fixed?: Partial<VocabularyQuery>;
  addHref?: string;
}) {
  const queryClient = useQueryClient();
  const { query, update } = useVocabularyQuery(fixed);
  const [deleting, setDeleting] = useState<Vocabulary | null>(null);
  const showScopeFilters = !fixed?.collectionId;

  // keepPreviousData: khi đổi trang/bộ lọc, giữ kết quả cũ trên màn hình cho tới khi có
  // kết quả mới — danh sách không nháy về trạng thái "đang tải".
  const list = useQuery({
    queryKey: qk.vocabularyList(query),
    queryFn: () => vocabulariesApi.list(query),
    placeholderData: keepPreviousData,
  });

  const languages = useQuery({
    queryKey: qk.languages,
    queryFn: languagesApi.list,
    enabled: showScopeFilters,
  });
  const language = useQuery({
    queryKey: qk.language(query.languageId),
    queryFn: () => languagesApi.get(query.languageId),
    enabled: showScopeFilters && query.languageId !== "",
  });
  const collections = useQuery({
    queryKey: qk.collectionsByLanguage(query.languageId),
    queryFn: () => collectionsApi.listByLanguage(query.languageId),
    enabled: showScopeFilters && query.languageId !== "",
  });

  const remove = useMutation({
    mutationFn: (vocabulary: Vocabulary) =>
      vocabulariesApi.remove(vocabulary.id),
    onSuccess: async (_, vocabulary) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.vocabularies }),
        queryClient.invalidateQueries({ queryKey: qk.languages }),
        queryClient.invalidateQueries({ queryKey: qk.collections }),
      ]);
      toast.success(`Đã xóa ${vocabulary.term}`);
      setDeleting(null);
    },
    onError: (e) => toast.error(e.message),
  });

  // Xóa từ cuối cùng của trang cuối → trang hiện tại không còn tồn tại. Lùi về trang cuối thật.
  const data = list.data;
  useEffect(() => {
    if (!data || list.isPlaceholderData) return;
    if (data.items.length === 0 && data.total > 0 && query.page > 1) {
      update({ page: Math.max(1, data.totalPages) });
    }
  }, [data, list.isPlaceholderData, query.page, update]);

  const hasFilters =
    query.search !== "" ||
    query.status !== "" ||
    (showScopeFilters &&
      (query.languageId !== "" ||
        query.levelId !== "" ||
        query.collectionId !== ""));

  return (
    <section aria-label="Danh sách từ vựng" className="space-y-4">
      <div
        className={cn(
          "grid gap-2",
          showScopeFilters
            ? "sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(5,minmax(0,1fr))]"
            : "sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]",
        )}
      >
        <SearchInput
          // key: khi URL đổi từ bên ngoài (Back, "Xóa bộ lọc"), ô nhập lấy lại giá trị từ URL.
          key={query.search}
          value={query.search}
          onChange={(search) => update({ search })}
        />
        {showScopeFilters && (
          <>
            <NativeSelect
              aria-label="Lọc theo ngôn ngữ"
              value={query.languageId}
              onChange={(e) =>
                update({
                  languageId: e.target.value,
                  levelId: "",
                  collectionId: "",
                })
              }
            >
              <option value="">Mọi ngôn ngữ</option>
              {languages.data?.items.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect
              aria-label="Lọc theo level"
              value={query.levelId}
              disabled={query.languageId === ""}
              onChange={(e) => update({ levelId: e.target.value })}
            >
              <option value="">Mọi level</option>
              {language.data?.levelSystems.map((system) => (
                <optgroup key={system.id} label={system.name}>
                  {system.levels.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </NativeSelect>
            <NativeSelect
              aria-label="Lọc theo bài học"
              value={query.collectionId}
              disabled={query.languageId === ""}
              onChange={(e) => update({ collectionId: e.target.value })}
            >
              <option value="">Mọi bài học</option>
              {collections.data?.items.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </>
        )}
        <NativeSelect
          aria-label="Lọc theo trạng thái"
          value={query.status}
          onChange={(e) =>
            update({ status: e.target.value as LearningStatus | "" })
          }
        >
          <option value="">Mọi trạng thái</option>
          {LEARNING_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Sắp xếp"
          value={query.sort}
          onChange={(e) => update({ sort: e.target.value as VocabularySort })}
        >
          {Object.entries(SORT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </div>

      {list.isPending && <LoadingState rows={5} />}
      {list.error && (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      )}

      {data && data.total === 0 && !hasFilters && (
        <EmptyState
          title="Chưa có từ nào"
          description="Thêm từ đầu tiên — chỉ cần từ và nghĩa."
          action={
            <Link href={addHref} className={cn(buttonVariants(), "h-10 px-4")}>
              <Plus aria-hidden /> Thêm từ
            </Link>
          }
        />
      )}
      {data && data.total === 0 && hasFilters && (
        <EmptyState
          title="Không có từ nào khớp"
          description="Thử từ khóa khác hoặc bỏ bớt bộ lọc."
          action={
            <Button
              variant="outline"
              onClick={() =>
                update({
                  search: "",
                  status: "",
                  languageId: "",
                  levelId: "",
                  collectionId: "",
                })
              }
            >
              Xóa bộ lọc
            </Button>
          }
        />
      )}

      {data && data.items.length > 0 && (
        <div
          className={cn(
            "transition-opacity",
            list.isPlaceholderData && "opacity-60",
          )}
        >
          {/* Mobile: thẻ. Bảng nhiều cột không đọc được ở 375px. */}
          <ul className="space-y-2 md:hidden">
            {data.items.map((v) => (
              <li key={v.id} className="rounded-xl border p-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p
                      lang={v.language.code ?? undefined}
                      className="text-2xl leading-tight font-medium break-words"
                    >
                      {v.term}
                    </p>
                    <Reading vocabulary={v} />
                    <p className="mt-1 break-words">{v.meaning}</p>
                  </div>
                  <RowActions vocabulary={v} onDelete={() => setDeleting(v)} />
                </div>
                <div className="mt-2">
                  <Tags vocabulary={v} />
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-hidden rounded-xl border md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Từ</th>
                  <th className="px-3 py-2 font-medium">Nghĩa</th>
                  <th className="px-3 py-2 font-medium">
                    Tiến độ · Level · Bài học
                  </th>
                  <th className="px-3 py-2">
                    <span className="sr-only">Hành động</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((v) => (
                  <tr key={v.id} className="border-t align-top">
                    <td className="px-3 py-2">
                      <span
                        lang={v.language.code ?? undefined}
                        className="block text-xl font-medium"
                      >
                        {v.term}
                      </span>
                      <Reading vocabulary={v} />
                    </td>
                    <td className="max-w-xs px-3 py-2 break-words">
                      {v.meaning}
                    </td>
                    <td className="px-3 py-2">
                      <Tags vocabulary={v} />
                    </td>
                    <td className="px-1 py-1">
                      <div className="flex justify-end">
                        <RowActions
                          vocabulary={v}
                          onDelete={() => setDeleting(v)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data && data.total > 0 && (
        <nav
          aria-label="Phân trang"
          className="flex flex-wrap items-center justify-between gap-2 text-sm"
        >
          <span className="text-muted-foreground">
            {data.total} từ · trang {query.page}/{Math.max(1, data.totalPages)}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="h-9"
              disabled={query.page <= 1}
              onClick={() => update({ page: query.page - 1 })}
            >
              Trước
            </Button>
            <Button
              variant="outline"
              className="h-9"
              disabled={query.page >= data.totalPages}
              onClick={() => update({ page: query.page + 1 })}
            >
              Sau
            </Button>
          </div>
        </nav>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={deleting ? `Xóa “${deleting.term}”?` : "Xóa?"}
        description="Từ này sẽ bị gỡ khỏi mọi bài học, kèm lịch sử ôn tập của nó. Không hoàn tác được."
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </section>
  );
}
