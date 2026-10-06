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
import { languagesApi } from "@/lib/api";
import { ApiError } from "@/lib/api-client";
import { qk } from "@/lib/query-keys";
import type { Language } from "@/types/api";

// Giới hạn khớp CreateLanguageDto của backend. Validate ở đây chỉ để phản hồi nhanh;
// backend vẫn là nơi quyết định cuối cùng.
const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Tên ngôn ngữ không được để trống")
    .max(50, "Tên ngôn ngữ dài tối đa 50 ký tự"),
  code: z.string().trim().max(10, "Mã ngôn ngữ dài tối đa 10 ký tự"),
});

type FormValues = z.infer<typeof schema>;

function LanguageForm({
  language,
  onDone,
}: {
  language?: Language;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: language?.name ?? "", code: language?.code ?? "" },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      language
        ? languagesApi.update(language.id, values)
        : languagesApi.create(values),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: qk.languages });
      toast.success(
        language ? `Đã cập nhật ${saved.name}` : `Đã thêm ${saved.name}`,
      );
      onDone();
    },
    onError: (error) => {
      // 409 = trùng tên. Gắn lỗi vào đúng ô, giữ nguyên những gì người dùng đã gõ.
      if (error instanceof ApiError && error.status === 409) {
        form.setError("name", { message: error.message });
        form.setFocus("name");
        return;
      }
      form.setError("root", { message: error.message });
    },
  });

  const { errors } = form.formState;

  return (
    <form
      onSubmit={(e) => void form.handleSubmit((v) => mutation.mutate(v))(e)}
      className="grid gap-4"
      noValidate
    >
      <div className="grid gap-2">
        <Label htmlFor="language-name">Tên ngôn ngữ</Label>
        <Input
          id="language-name"
          placeholder="Japanese"
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
        <Label htmlFor="language-code">
          Mã{" "}
          <span className="font-normal text-muted-foreground">
            (tùy chọn — ja, zh, en…)
          </span>
        </Label>
        <Input
          id="language-code"
          placeholder="ja"
          autoComplete="off"
          aria-invalid={!!errors.code}
          {...form.register("code")}
        />
        {errors.code && (
          <p role="alert" className="text-sm text-destructive">
            {errors.code.message}
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

export function LanguageFormDialog({
  open,
  onOpenChange,
  language,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language?: Language;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {language ? "Sửa ngôn ngữ" : "Thêm ngôn ngữ"}
          </DialogTitle>
          <DialogDescription>
            Mỗi ngôn ngữ có hệ thống level và các bài học riêng.
          </DialogDescription>
        </DialogHeader>
        {/* Form chỉ tồn tại khi dialog mở → mỗi lần mở là một form mới, không sót giá trị cũ. */}
        {open && (
          <LanguageForm
            key={language?.id ?? "new"}
            language={language}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
