"use client";

import { useState } from "react";
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

function NameForm({
  label,
  initialValue,
  maxLength,
  onSubmit,
  onDone,
}: {
  label: string;
  initialValue: string;
  maxLength: number;
  onSubmit: (name: string) => Promise<unknown>;
  onDone: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    const name = value.trim();
    if (!name) {
      setError("Không được để trống");
      return;
    }
    setPending(true);
    try {
      await onSubmit(name);
      onDone();
    } catch (e) {
      // Giữ dialog mở và giữ nguyên chữ đã gõ để người dùng sửa rồi thử lại.
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="name-dialog-input">{label}</Label>
        <Input
          id="name-dialog-input"
          value={value}
          maxLength={maxLength}
          autoFocus
          autoComplete="off"
          aria-invalid={!!error}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
        />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? "Đang lưu…" : "Lưu"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Hộp thoại một ô nhập — dùng cho đổi tên / thêm nhanh những thứ chỉ có một cái tên. */
export function NameDialog({
  open,
  onOpenChange,
  title,
  label,
  initialValue = "",
  maxLength = 50,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  label: string;
  initialValue?: string;
  maxLength?: number;
  onSubmit: (name: string) => Promise<unknown>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {open && (
          <NameForm
            label={label}
            initialValue={initialValue}
            maxLength={maxLength}
            onSubmit={onSubmit}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
