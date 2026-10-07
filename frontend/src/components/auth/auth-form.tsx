"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api";
import { ApiError } from "@/lib/api-client";
import { safeNext } from "@/lib/auth";
import { qk } from "@/lib/query-keys";
import { clearContext } from "@/lib/vocabulary-context";

// Khớp RegisterDto của backend. Backend vẫn là nơi quyết định cuối cùng.
const PASSWORD_MIN_LENGTH = 8;

const loginSchema = z.object({
  email: z.string().trim().min(1, "Nhập email").email("Email không hợp lệ"),
  // KHÔNG trim mật khẩu: khoảng trắng đầu/cuối là một phần của mật khẩu.
  password: z.string().min(1, "Nhập mật khẩu"),
  displayName: z.string(),
});

const registerSchema = loginSchema.extend({
  password: z
    .string()
    .min(
      PASSWORD_MIN_LENGTH,
      `Mật khẩu cần ít nhất ${PASSWORD_MIN_LENGTH} ký tự`,
    )
    .max(128, "Mật khẩu dài tối đa 128 ký tự"),
  displayName: z.string().trim().max(50, "Tên hiển thị dài tối đa 50 ký tự"),
});

type FormValues = z.infer<typeof loginSchema>;

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const isRegister = mode === "register";
  const router = useRouter();
  const queryClient = useQueryClient();
  const next = safeNext(useSearchParams().get("next"));
  const nextQuery = next === "/" ? "" : `?next=${encodeURIComponent(next)}`;

  // Đã đăng nhập sẵn mà mở /login thì đi thẳng vào app.
  const me = useQuery({ queryKey: qk.me, queryFn: authApi.me, retry: false });
  const alreadySignedIn = me.isSuccess;
  useEffect(() => {
    if (alreadySignedIn) router.replace(next);
  }, [alreadySignedIn, next, router]);

  const form = useForm<FormValues>({
    resolver: zodResolver(isRegister ? registerSchema : loginSchema),
    defaultValues: { email: "", password: "", displayName: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      isRegister
        ? authApi.register({
            email: values.email,
            password: values.password,
            displayName: values.displayName || null,
          })
        : authApi.login({ email: values.email, password: values.password }),
    onSuccess: (result) => {
      // Xóa sạch cache: dữ liệu đang nhớ có thể thuộc về tài khoản vừa đăng xuất.
      queryClient.clear();
      clearContext();
      if (result.claimedExistingData) {
        toast.success(
          "Đã chuyển toàn bộ dữ liệu có sẵn vào tài khoản của bạn",
          {
            duration: 8000,
          },
        );
      }
      router.replace(next);
    },
    onError: (error) => {
      // Xóa mật khẩu đã gõ sau một lần thất bại; giữ lại email.
      form.resetField("password");
      const message =
        error instanceof ApiError && error.status === 429
          ? "Bạn thử quá nhiều lần. Chờ một phút rồi thử lại."
          : error.message;
      if (error instanceof ApiError && error.status === 409) {
        form.setError("email", { message });
        form.setFocus("email");
        return;
      }
      form.setError("root", { message });
      form.setFocus("password");
    },
  });

  const { errors } = form.formState;

  return (
    <div className="mx-auto w-full max-w-sm py-8">
      <h1 className="text-2xl font-semibold">
        {isRegister ? "Tạo tài khoản" : "Đăng nhập"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {isRegister
          ? "Mỗi tài khoản có kho từ vựng và tiến độ học riêng."
          : "Đăng nhập để vào kho từ vựng của bạn."}
      </p>

      <form
        onSubmit={(e) => void form.handleSubmit((v) => mutation.mutate(v))(e)}
        className="mt-6 grid gap-4"
        noValidate
      >
        <div className="grid gap-2">
          <Label htmlFor="auth-email">Email</Label>
          <Input
            id="auth-email"
            type="email"
            autoComplete="email"
            autoFocus
            className="h-10"
            aria-invalid={!!errors.email}
            {...form.register("email")}
          />
          {errors.email && (
            <p role="alert" className="text-sm text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>

        {isRegister && (
          <div className="grid gap-2">
            <Label htmlFor="auth-name">
              Tên hiển thị{" "}
              <span className="font-normal text-muted-foreground">
                (tùy chọn)
              </span>
            </Label>
            <Input
              id="auth-name"
              autoComplete="nickname"
              className="h-10"
              aria-invalid={!!errors.displayName}
              {...form.register("displayName")}
            />
            {errors.displayName && (
              <p role="alert" className="text-sm text-destructive">
                {errors.displayName.message}
              </p>
            )}
          </div>
        )}

        <div className="grid gap-2">
          <Label htmlFor="auth-password">Mật khẩu</Label>
          <Input
            id="auth-password"
            type="password"
            // Gợi ý cho trình quản lý mật khẩu: tạo mới khi đăng ký, điền sẵn khi đăng nhập.
            autoComplete={isRegister ? "new-password" : "current-password"}
            className="h-10"
            aria-invalid={!!errors.password}
            {...form.register("password")}
          />
          {isRegister && !errors.password && (
            <p className="text-sm text-muted-foreground">
              Ít nhất {PASSWORD_MIN_LENGTH} ký tự.
            </p>
          )}
          {errors.password && (
            <p role="alert" className="text-sm text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        {errors.root && (
          <p role="alert" className="text-sm text-destructive">
            {errors.root.message}
          </p>
        )}

        <Button
          type="submit"
          className="h-11 text-base"
          disabled={mutation.isPending || mutation.isSuccess}
        >
          {mutation.isPending
            ? "Đang xử lý…"
            : isRegister
              ? "Tạo tài khoản"
              : "Đăng nhập"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        {isRegister ? "Đã có tài khoản? " : "Chưa có tài khoản? "}
        <Link
          href={`${isRegister ? "/login" : "/register"}${nextQuery}`}
          className="font-medium text-foreground underline underline-offset-4 hover:text-muted-foreground"
        >
          {isRegister ? "Đăng nhập" : "Tạo tài khoản"}
        </Link>
      </p>
    </div>
  );
}
