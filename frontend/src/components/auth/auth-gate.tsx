"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { ErrorState, LoadingState } from "@/components/states";
import { authApi } from "@/lib/api";
import { ApiError } from "@/lib/api-client";
import { loginUrl } from "@/lib/auth";
import { qk } from "@/lib/query-keys";
import type { User } from "@/types/api";

/**
 * Cổng vào phần app cần đăng nhập: hỏi backend "tôi là ai?" (cookie httpOnly — JavaScript
 * không tự đọc được), chưa đăng nhập thì chuyển về /login kèm trang đang định mở.
 *
 * Đây là tiện ích điều hướng, KHÔNG phải lớp bảo vệ: thứ thật sự giữ dữ liệu là JwtAuthGuard
 * ở backend. Ai tắt được đoạn này cũng chỉ thấy một giao diện rỗng với các request 401.
 */
export function AuthGate({
  children,
}: {
  children: (user: User) => React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const me = useQuery({
    queryKey: qk.me,
    queryFn: authApi.me,
    staleTime: 5 * 60_000,
    // 401 là câu trả lời dứt khoát "chưa đăng nhập", không phải lỗi tạm thời.
    retry: (count, error) =>
      !(error instanceof ApiError && error.status === 401) && count < 1,
  });
  const unauthorized = me.error instanceof ApiError && me.error.status === 401;

  useEffect(() => {
    if (!unauthorized) return;
    // Đọc query string từ window thay vì useSearchParams: hook đó buộc cả layout gốc phải
    // nằm trong Suspense.
    router.replace(loginUrl(pathname + window.location.search));
  }, [unauthorized, pathname, router]);

  // Chưa biết là ai (hoặc đang chuyển sang /login): KHÔNG render trang bên trong — nếu
  // render, nó sẽ bắn một loạt request chắc chắn bị 401.
  if (me.isPending || unauthorized) {
    return (
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6">
        <LoadingState rows={3} />
      </div>
    );
  }
  if (me.error) {
    return (
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6">
        <ErrorState error={me.error} onRetry={() => void me.refetch()} />
      </div>
    );
  }
  return <>{children(me.data)}</>;
}
