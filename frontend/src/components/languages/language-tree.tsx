"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Pencil, Plus, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
  CollectionFormDialog,
  type CollectionDialogTarget,
} from "@/components/collections/collection-form-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { LevelSystemFormDialog } from "@/components/languages/level-system-form-dialog";
import { NameDialog } from "@/components/name-dialog";
import { EmptyState, ErrorState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { collectionsApi, levelSystemsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { Collection, Level, LevelSystem } from "@/types/api";

type NamePrompt = {
  title: string;
  label: string;
  initialValue?: string;
  successMessage: string;
  submit: (name: string) => Promise<unknown>;
};

type DeletePrompt = {
  title: string;
  description: React.ReactNode;
  successMessage: string;
  run: () => Promise<unknown>;
};

function CollectionRow({
  collection,
  onEdit,
  onDelete,
}: {
  collection: Collection;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-center gap-1 rounded-md pl-2 hover:bg-muted/50">
      <Link
        href={`/collections/${collection.id}`}
        className="min-w-0 flex-1 truncate py-2 text-sm hover:underline"
      >
        {collection.name}
      </Link>
      <span className="shrink-0 text-xs text-muted-foreground">
        {collection.vocabularyCount} từ
      </span>
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label={`Sửa ${collection.name}`}
        onClick={onEdit}
      >
        <Pencil aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon-lg"
        className="text-destructive"
        aria-label={`Xóa ${collection.name}`}
        onClick={onDelete}
      >
        <Trash2 aria-hidden />
      </Button>
    </li>
  );
}

export function LanguageTree({
  languageId,
  levelSystems,
}: {
  languageId: string;
  levelSystems: LevelSystem[];
}) {
  const queryClient = useQueryClient();
  const [systemDialogOpen, setSystemDialogOpen] = useState(false);
  const [namePrompt, setNamePrompt] = useState<NamePrompt | null>(null);
  const [deletePrompt, setDeletePrompt] = useState<DeletePrompt | null>(null);
  const [collectionTarget, setCollectionTarget] =
    useState<CollectionDialogTarget | null>(null);

  const collectionsQuery = useQuery({
    queryKey: qk.collectionsByLanguage(languageId),
    queryFn: () => collectionsApi.listByLanguage(languageId),
  });
  const collections = collectionsQuery.data?.items ?? [];

  // Xóa level làm collection của nó rơi về "xuyên level" → phải làm mới cả hai nguồn dữ liệu.
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: qk.language(languageId) }),
      queryClient.invalidateQueries({ queryKey: qk.collections }),
      // Danh sách từ hiển thị tên level và tên bài học của từng từ.
      queryClient.invalidateQueries({ queryKey: qk.vocabularies }),
    ]);

  const action = useMutation({
    mutationFn: (job: { run: () => Promise<unknown>; success?: string }) =>
      job.run(),
    onSuccess: async (_, job) => {
      await refresh();
      if (job.success) toast.success(job.success);
      setDeletePrompt(null);
    },
    onError: (e) => toast.error(e.message),
  });

  function promptName(prompt: NamePrompt) {
    setNamePrompt(prompt);
  }

  function moveLevel(system: LevelSystem, index: number, delta: -1 | 1) {
    const ids = system.levels.map((level) => level.id);
    const target = index + delta;
    const moved = ids[index];
    const swapped = ids[target];
    if (moved === undefined || swapped === undefined) return;
    ids[index] = swapped;
    ids[target] = moved;
    action.mutate({ run: () => levelSystemsApi.reorderLevels(system.id, ids) });
  }

  function confirmDeleteCollection(collection: Collection) {
    setDeletePrompt({
      title: `Xóa ${collection.name}?`,
      description: (
        <>
          Chỉ xóa bài học/chủ đề này.{" "}
          <strong>Từ vựng bên trong không bị xóa</strong> — chúng vẫn nằm ở các
          bài học khác và trong danh sách từ.
        </>
      ),
      successMessage: `Đã xóa ${collection.name}`,
      run: () => collectionsApi.remove(collection.id),
    });
  }

  function renderCollections(items: Collection[]) {
    if (items.length === 0) return null;
    return (
      <ul className="mt-1">
        {items.map((collection) => (
          <CollectionRow
            key={collection.id}
            collection={collection}
            onEdit={() => setCollectionTarget({ collection })}
            onDelete={() => confirmDeleteCollection(collection)}
          />
        ))}
      </ul>
    );
  }

  function renderLevel(system: LevelSystem, level: Level, index: number) {
    const items = collections.filter((c) => c.levelId === level.id);
    return (
      <li key={level.id} className="border-t px-3 py-2">
        <div className="flex items-center gap-1">
          <span className="min-w-0 flex-1 truncate font-medium">
            {level.name}
          </span>
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label={`Đưa ${level.name} lên`}
            disabled={index === 0 || action.isPending}
            onClick={() => moveLevel(system, index, -1)}
          >
            <ArrowUp aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label={`Đưa ${level.name} xuống`}
            disabled={index === system.levels.length - 1 || action.isPending}
            onClick={() => moveLevel(system, index, 1)}
          >
            <ArrowDown aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label={`Đổi tên ${level.name}`}
            onClick={() =>
              promptName({
                title: "Đổi tên level",
                label: "Tên level",
                initialValue: level.name,
                successMessage: "Đã đổi tên level",
                submit: (name) => levelSystemsApi.renameLevel(level.id, name),
              })
            }
          >
            <Pencil aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon-lg"
            className="text-destructive"
            aria-label={`Xóa ${level.name}`}
            onClick={() =>
              setDeletePrompt({
                title: `Xóa level ${level.name}?`,
                description: (
                  <>
                    {items.length} bài học của level này{" "}
                    <strong>không bị xóa</strong> — chúng chuyển sang nhóm
                    “Xuyên level”.
                  </>
                ),
                successMessage: `Đã xóa ${level.name}`,
                run: () => levelSystemsApi.removeLevel(level.id),
              })
            }
          >
            <Trash2 aria-hidden />
          </Button>
        </div>
        <div className="pl-3">
          {renderCollections(items)}
          <Button
            variant="ghost"
            className="mt-1 text-muted-foreground"
            aria-label={`Thêm bài học vào ${level.name}`}
            onClick={() =>
              setCollectionTarget({
                defaults: { levelId: level.id, kind: "LESSON" },
              })
            }
          >
            <Plus aria-hidden /> Bài học
          </Button>
        </div>
      </li>
    );
  }

  const topics = collections.filter((c) => c.levelId === null);

  return (
    <section aria-label="Level và bài học" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Level &amp; bài học</h2>
        <Button variant="outline" onClick={() => setSystemDialogOpen(true)}>
          <Plus aria-hidden /> Hệ thống level
        </Button>
      </div>

      {collectionsQuery.error && (
        <ErrorState
          error={collectionsQuery.error}
          onRetry={() => void collectionsQuery.refetch()}
        />
      )}
      {collectionsQuery.data &&
        collectionsQuery.data.total > collections.length && (
          <p className="text-sm text-amber-700">
            Đang hiện {collections.length}/{collectionsQuery.data.total} bài học
            đầu tiên.
          </p>
        )}

      {levelSystems.length === 0 && (
        <EmptyState
          title="Chưa có hệ thống level"
          description="Tạo JLPT, HSK, CEFR hoặc hệ thống của riêng bạn để chia bài học theo trình độ."
          action={
            <Button onClick={() => setSystemDialogOpen(true)}>
              <Plus aria-hidden /> Thêm hệ thống level
            </Button>
          }
        />
      )}

      {levelSystems.map((system) => (
        <div key={system.id} className="rounded-xl border">
          <div className="flex items-center gap-1 px-3 py-2">
            <h3 className="min-w-0 truncate font-semibold">{system.name}</h3>
            {system.isDefault ? (
              <Badge variant="secondary">Mặc định</Badge>
            ) : (
              <Button
                variant="ghost"
                size="icon-lg"
                aria-label={`Đặt ${system.name} làm mặc định`}
                title="Đặt làm mặc định"
                onClick={() =>
                  action.mutate({
                    run: () =>
                      levelSystemsApi.update(system.id, { isDefault: true }),
                    success: `${system.name} là hệ thống mặc định`,
                  })
                }
              >
                <Star aria-hidden />
              </Button>
            )}
            <span className="flex-1" />
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label={`Đổi tên ${system.name}`}
              onClick={() =>
                promptName({
                  title: "Đổi tên hệ thống level",
                  label: "Tên hệ thống",
                  initialValue: system.name,
                  successMessage: "Đã đổi tên",
                  submit: (name) => levelSystemsApi.update(system.id, { name }),
                })
              }
            >
              <Pencil aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="icon-lg"
              className="text-destructive"
              aria-label={`Xóa ${system.name}`}
              onClick={() =>
                setDeletePrompt({
                  title: `Xóa ${system.name}?`,
                  description: (
                    <>
                      {system.levels.length} level sẽ bị xóa. Bài học và từ vựng{" "}
                      <strong>không bị xóa</strong> — chúng chuyển sang nhóm
                      “Xuyên level”.
                    </>
                  ),
                  successMessage: `Đã xóa ${system.name}`,
                  run: () => levelSystemsApi.remove(system.id),
                })
              }
            >
              <Trash2 aria-hidden />
            </Button>
          </div>
          <ul>{system.levels.map((l, i) => renderLevel(system, l, i))}</ul>
          <div className="border-t px-3 py-2">
            <Button
              variant="ghost"
              className="text-muted-foreground"
              aria-label={`Thêm level vào ${system.name}`}
              onClick={() =>
                promptName({
                  title: `Thêm level vào ${system.name}`,
                  label: "Tên level",
                  successMessage: "Đã thêm level",
                  submit: (name) => levelSystemsApi.addLevel(system.id, name),
                })
              }
            >
              <Plus aria-hidden /> Level
            </Button>
          </div>
        </div>
      ))}

      <div className="rounded-xl border px-3 py-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Chủ đề</h3>
          <span className="text-sm text-muted-foreground">
            xuyên level — ví dụ “Food”
          </span>
        </div>
        {renderCollections(topics)}
        <Button
          variant="ghost"
          className="mt-1 text-muted-foreground"
          onClick={() =>
            setCollectionTarget({ defaults: { levelId: null, kind: "TOPIC" } })
          }
        >
          <Plus aria-hidden /> Chủ đề
        </Button>
      </div>

      <LevelSystemFormDialog
        open={systemDialogOpen}
        onOpenChange={setSystemDialogOpen}
        languageId={languageId}
      />
      <NameDialog
        open={namePrompt !== null}
        onOpenChange={(open) => !open && setNamePrompt(null)}
        title={namePrompt?.title ?? ""}
        label={namePrompt?.label ?? ""}
        initialValue={namePrompt?.initialValue}
        onSubmit={async (name) => {
          if (!namePrompt) return;
          await namePrompt.submit(name);
          await refresh();
          toast.success(namePrompt.successMessage);
        }}
      />
      <CollectionFormDialog
        target={collectionTarget}
        onClose={() => setCollectionTarget(null)}
        languageId={languageId}
        levelSystems={levelSystems}
      />
      <ConfirmDialog
        open={deletePrompt !== null}
        onOpenChange={(open) => !open && setDeletePrompt(null)}
        title={deletePrompt?.title ?? ""}
        description={deletePrompt?.description}
        pending={action.isPending}
        onConfirm={() =>
          deletePrompt &&
          action.mutate({
            run: deletePrompt.run,
            success: deletePrompt.successMessage,
          })
        }
      />
    </section>
  );
}
