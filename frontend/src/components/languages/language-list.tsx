"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { LanguageFormDialog } from "@/components/languages/language-form-dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { languagesApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { Language } from "@/types/api";

type DialogState =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; language: Language }
  | { kind: "delete"; language: Language };

export function LanguageList() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<DialogState>({ kind: "closed" });
  const close = () => setDialog({ kind: "closed" });

  const { data, error, isPending, refetch } = useQuery({
    queryKey: qk.languages,
    queryFn: languagesApi.list,
  });

  const remove = useMutation({
    mutationFn: (language: Language) => languagesApi.remove(language.id),
    onSuccess: async (_, language) => {
      await queryClient.invalidateQueries({ queryKey: qk.languages });
      toast.success(`Đã xóa ${language.name}`);
      close();
    },
    onError: (e) => toast.error(e.message),
  });

  const addButton = (
    <Button onClick={() => setDialog({ kind: "create" })}>
      <Plus aria-hidden /> Thêm ngôn ngữ
    </Button>
  );

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Ngôn ngữ</h1>
        {data && data.items.length > 0 && addButton}
      </div>

      {isPending && <LoadingState />}
      {error && <ErrorState error={error} onRetry={() => void refetch()} />}
      {data && data.items.length === 0 && (
        <EmptyState
          title="Chưa có ngôn ngữ nào"
          description="Bắt đầu bằng việc thêm ngôn ngữ bạn đang học."
          action={addButton}
        />
      )}
      {data && data.items.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((language) => (
            <li
              key={language.id}
              className="relative flex items-center gap-2 rounded-xl border p-4 hover:bg-muted/40"
            >
              <div className="min-w-0 flex-1">
                {/* after:inset-0 phủ link lên cả thẻ → bấm đâu cũng mở, mà vẫn chỉ có một link cho trình đọc màn hình. */}
                <Link
                  href={`/languages/${language.id}`}
                  className="block truncate font-medium after:absolute after:inset-0"
                >
                  {language.name}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {language.vocabularyCount} từ
                  {language.code && ` · ${language.code}`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-lg"
                className="relative z-10"
                aria-label={`Sửa ${language.name}`}
                onClick={() => setDialog({ kind: "edit", language })}
              >
                <Pencil aria-hidden />
              </Button>
              <Button
                variant="ghost"
                size="icon-lg"
                className="relative z-10 text-destructive"
                aria-label={`Xóa ${language.name}`}
                onClick={() => setDialog({ kind: "delete", language })}
              >
                <Trash2 aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <LanguageFormDialog
        open={dialog.kind === "create" || dialog.kind === "edit"}
        onOpenChange={(open) => !open && close()}
        language={dialog.kind === "edit" ? dialog.language : undefined}
      />
      <ConfirmDialog
        open={dialog.kind === "delete"}
        onOpenChange={(open) => !open && close()}
        title={
          dialog.kind === "delete" ? `Xóa ${dialog.language.name}?` : "Xóa?"
        }
        description={
          dialog.kind === "delete" && (
            <>
              Toàn bộ level, bài học và{" "}
              <strong>{dialog.language.vocabularyCount} từ vựng</strong> của
              ngôn ngữ này sẽ bị xóa. Không hoàn tác được.
            </>
          )
        }
        pending={remove.isPending}
        onConfirm={() =>
          dialog.kind === "delete" && remove.mutate(dialog.language)
        }
      />
    </>
  );
}
