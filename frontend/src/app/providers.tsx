"use client";

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useState } from "react";
import { ApiError } from "@/lib/api-client";
import { qk } from "@/lib/query-keys";

function createQueryClient(): QueryClient {
  // Phiên đăng nhập có thể hết hạn GIỮA CHỪNG (cookie sống 7 ngày). Khi bất kỳ request nào
  // nhận 401, hỏi lại "tôi là ai?" — câu trả lời 401 của nó sẽ khiến AuthGate đưa người
  // dùng về trang đăng nhập, thay vì để họ nhìn một màn hình lỗi khó hiểu.
  const onError = (error: unknown, isMeQuery: boolean) => {
    if (isMeQuery) return;
    if (error instanceof ApiError && error.status === 401) {
      void client.invalidateQueries({ queryKey: qk.me });
    }
  };
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => onError(error, query.queryKey[0] === qk.me[0]),
    }),
    mutationCache: new MutationCache({
      onError: (error) => onError(error, false),
    }),
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1 },
    },
  });
  return client;
}

export function Providers({ children }: { children: React.ReactNode }) {
  // useState thay vì tạo QueryClient ở module scope: mỗi lần render trên server
  // phải có client riêng, nếu không cache của request này rò sang request khác.
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
