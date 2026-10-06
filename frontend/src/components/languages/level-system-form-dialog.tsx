"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { levelSystemsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";

// Mẫu CHỈ để điền sẵn form — không có level nào được hard-code vào database (PLAN F2).
const TEMPLATES: { name: string; levels: string[] }[] = [
  { name: "JLPT", levels: ["N5", "N4", "N3", "N2", "N1"] },
  {
    name: "HSK",
    levels: ["HSK 1", "HSK 2", "HSK 3", "HSK 4", "HSK 5", "HSK 6"],
  },
  { name: "CEFR", levels: ["A1", "A2", "B1", "B2", "C1", "C2"] },
];

export function parseLevelLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

const schema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Tên hệ thống không được để trống")
      .max(50, "Tên dài tối đa 50 ký tự"),
    levels: z.string(),
  })
  .superRefine((value, ctx) => {
    const lines = parseLevelLines(value.levels);
    const issue = (message: string) =>
      ctx.addIssue({ code: "custom", path: ["levels"], message });
    if (lines.length > 50) issue("Tối đa 50 level");
    if (lines.some((line) => line.length > 50)) {
      issue("Mỗi level dài tối đa 50 ký tự");
    }
    if (new Set(lines).size !== lines.length) issue("Có level bị trùng tên");
  });

type FormValues = z.infer<typeof schema>;

function LevelSystemForm({
  languageId,
  onDone,
}: {
  languageId: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", levels: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      levelSystemsApi.create(languageId, {
        name: values.name,
        levels: parseLevelLines(values.levels).map((name) => ({ name })),
      }),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({
        queryKey: qk.language(languageId),
      });
      toast.success(`Đã tạo ${saved.name} (${saved.levels.length} level)`);
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
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Điền theo mẫu:</span>
        {TEMPLATES.map((template) => (
          <Button
            key={template.name}
            type="button"
            variant="outline"
            onClick={() => {
              form.setValue("name", template.name, { shouldValidate: true });
              form.setValue("levels", template.levels.join("\n"), {
                shouldValidate: true,
              });
            }}
          >
            {template.name}
          </Button>
        ))}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="level-system-name">Tên hệ thống</Label>
        <Input
          id="level-system-name"
          placeholder="JLPT"
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
      <div className="grid gap-2">
        <Label htmlFor="level-system-levels">
          Các level{" "}
          <span className="font-normal text-muted-foreground">
            (mỗi dòng một level, từ dễ đến khó)
          </span>
        </Label>
        <Textarea
          id="level-system-levels"
          rows={6}
          placeholder={"N5\nN4\nN3"}
          aria-invalid={!!errors.levels}
          {...form.register("levels")}
        />
        {errors.levels && (
          <p role="alert" className="text-sm text-destructive">
            {errors.levels.message}
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
          {mutation.isPending ? "Đang lưu…" : "Tạo"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function LevelSystemFormDialog({
  open,
  onOpenChange,
  languageId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  languageId: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm hệ thống level</DialogTitle>
          <DialogDescription>
            Ví dụ JLPT cho tiếng Nhật, HSK cho tiếng Trung. Sửa được sau.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <LevelSystemForm
            languageId={languageId}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
