"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { toQueryString } from "@/lib/api";
import {
  VOCABULARY_SORTS,
  type VocabularyQuery,
  type VocabularySort,
} from "@/types/api";

export const PAGE_SIZE = 20;
const DEFAULT_SORT: VocabularySort = "createdAt:desc";

function parseSort(value: string | null): VocabularySort {
  return VOCABULARY_SORTS.find((sort) => sort === value) ?? DEFAULT_SORT;
}

function parsePage(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

/**
 * Trạng thái tìm/lọc/sắp xếp/trang sống trên URL, không sống trong useState:
 * tải lại trang, bấm Back, hay gửi link cho người khác đều giữ nguyên bộ lọc.
 *
 * `fixed` là bộ lọc bị khóa bởi trang chứa (ví dụ trang một bài học khóa collectionId).
 */
export function useVocabularyQuery(fixed: Partial<VocabularyQuery> = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const fixedKey = JSON.stringify(fixed);
  const query = useMemo<VocabularyQuery>(
    () => ({
      page: parsePage(params.get("page")),
      limit: PAGE_SIZE,
      search: params.get("search") ?? "",
      languageId: params.get("languageId") ?? "",
      levelId: params.get("levelId") ?? "",
      collectionId: params.get("collectionId") ?? "",
      sort: parseSort(params.get("sort")),
      ...(JSON.parse(fixedKey) as Partial<VocabularyQuery>),
    }),
    [params, fixedKey],
  );

  const update = useCallback(
    (patch: Partial<VocabularyQuery>) => {
      // Đổi bộ lọc mà giữ nguyên số trang thì dễ rơi vào một trang không tồn tại.
      const next = { ...query, page: 1, ...patch };
      const locked = JSON.parse(fixedKey) as Partial<VocabularyQuery>;
      const qs = toQueryString({
        search: next.search,
        languageId: "languageId" in locked ? "" : next.languageId,
        levelId: "levelId" in locked ? "" : next.levelId,
        collectionId: "collectionId" in locked ? "" : next.collectionId,
        // Giá trị mặc định không cần nằm trên URL.
        sort: next.sort === DEFAULT_SORT ? "" : next.sort,
        page: next.page === 1 ? "" : next.page,
      });
      // replace, không push: mỗi ký tự gõ vào ô tìm kiếm không nên là một bước Back.
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [query, fixedKey, pathname, router],
  );

  return { query, update };
}
