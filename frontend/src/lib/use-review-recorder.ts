"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { toast } from "sonner";
import { learningApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { ReviewInput } from "@/types/api";

/**
 * Ghi kết quả ôn "ngầm": xếp request vào hàng rồi đi tiếp NGAY, không await. Người học
 * không bao giờ phải chờ mạng giữa hai thẻ.
 *
 * Request được gửi LẦN LƯỢT (cái sau chờ cái trước xong), không song song: backend tính
 * chuỗi trả lời đúng theo thứ tự, nên "Quên" rồi "Được" trên cùng một thẻ mà tới ngược
 * thứ tự sẽ cho ra trạng thái sai.
 *
 * Cái giá của việc không chờ: nếu request lỗi thì thẻ đã trôi qua. Vì vậy lỗi phải được
 * báo ra (một lần mỗi phiên, không spam) thay vì nuốt im lặng — nếu không, người dùng học
 * cả buổi mà không có gì được lưu.
 */
export function useReviewRecorder(): (input: ReviewInput) => void {
  const queryClient = useQueryClient();
  const warned = useRef(false);
  const queue = useRef<Promise<void>>(Promise.resolve());

  return useCallback(
    (input: ReviewInput) => {
      queue.current = queue.current.then(() =>
        learningApi.review(input).then(
          () => {
            void queryClient.invalidateQueries({ queryKey: qk.vocabularies });
            void queryClient.invalidateQueries({ queryKey: qk.learning });
          },
          () => {
            // Nuốt lỗi ở đây để hàng đợi không dừng lại: các thẻ sau vẫn phải được gửi.
            if (warned.current) return;
            warned.current = true;
            toast.error("Không lưu được kết quả ôn", {
              description:
                "Bạn vẫn học tiếp được, nhưng tiến độ của phiên này có thể không được ghi lại.",
              duration: 10_000,
            });
          },
        ),
      );
    },
    [queryClient],
  );
}
