"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { collectionsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { Collection, LevelSystem } from "@/types/api";

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Tên không được để trống")
    .max(100, "Tên dài tối đa 100 ký tự"),
  kind: z.enum(["LESSON", "TOPIC"]),
  // "" = xuyên level. <select> chỉ giữ được chuỗi, nên quy đổi sang null lúc gửi.
  levelId: z.string(),
  description: z.string().trim().max(500, "Mô tả dài tối đa 500 ký tự"),
});

type FormValues = z.infer<typeof schema>;

export interface CollectionDialogTarget {
  /** Có → sửa; không có → tạo mới. */
  collection?: Collection;
  /** Giá trị điền sẵn khi tạo mới từ một nhánh của cây. */
  defaults?: { levelId: string | null; kind: Collection["kind"] };
}

function CollectionForm({
  languageId,
  levelSystems,
  target,
  onDone,
}: {
  languageId: string;
  levelSystems: LevelSystem[];
  target: CollectionDialogTarget;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const { collection, defaults } = target;
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: collection?.name ?? "",
      kind: collection?.kind ?? defaults?.kind ?? "LESSON",
      levelId: collection?.levelId ?? defaults?.levelId ?? "",
      description: collection?.description ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const body = {
        name: values.name,
        kind: values.kind,
        levelId: values.levelId || null,
        description: values.description || null,
      };
      return collection
        ? collectionsApi.update(collection.id, body)
        : collectionsApi.create({ languageId, ...body });
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: qk.collections });
      toast.success(
        collection ? `Đã cập nhật ${saved.name}` : `Đã thêm ${saved.name}`,
      );
      onDone();
    },
    onError: (error) => form.setError("root", { message: error.message }),
  });

  const { errors } = form.formState;

  return (
    <form
      onSubmit={(e) => void form.handleSubmit((v) => mutation.mutate(v))(e)}
      className="grid gap-4"
      noValidate
    >
      <div className="grid gap-2">
        <Label htmlFor="collection-name">Tên</Label>
        <Input
          id="collection-name"
          placeholder="Lesson 3"
          autoFocus
          autoComplete="off"
          aria-invalid={!!errors.name}
          {...form.register("name")}
        />
        {errors.name && (
          <p role="alert" className="text-sm text-destructive">
            {errors.name.message}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="collection-kind">Loại</Label>
          <NativeSelect id="collection-kind" {...form.register("kind")}>
            <option value="LESSON">Bài học</option>
            <option value="TOPIC">Chủ đề</option>
          </NativeSelect>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="collection-level">Level</Label>
          <NativeSelect id="collection-level" {...form.register("levelId")}>
            <option value="">Xuyên level</option>
            {levelSystems.map((system) => (
              <optgroup key={system.id} label={system.name}>
                {system.levels.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </NativeSelect>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="collection-description">
          Mô tả{" "}
          <span className="font-normal text-muted-foreground">(tùy chọn)</span>
        </Label>
        <Textarea
          id="collection-description"
          rows={2}
          aria-invalid={!!errors.description}
          {...form.register("description")}
        />
        {errors.description && (
          <p role="alert" className="text-sm text-destructive">
            {errors.description.message}
          </p>
        )}
      </div>
      {errors.root && (
        <p role="alert" className="text-sm text-destructive">
          {errors.root.message}
        </p>
      )}
      <DialogFooter>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Đang lưu…" : "Lưu"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function CollectionFormDialog({
  target,
  onClose,
  languageId,
  levelSystems,
}: {
  /** null = đóng. */
  target: CollectionDialogTarget | null;
  onClose: () => void;
  languageId: string;
  levelSystems: LevelSystem[];
}) {
  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {target?.collection
              ? "Sửa bài học / chủ đề"
              : "Thêm bài học / chủ đề"}
          </DialogTitle>
        </DialogHeader>
        {target && (
          <CollectionForm
            key={target.collection?.id ?? "new"}
            languageId={languageId}
            levelSystems={levelSystems}
            target={target}
            onDone={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
