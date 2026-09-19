---
name: frontend-nextjs
description: Mẫu chuẩn frontend Next.js của dự án — cấu trúc App Router, gọi API qua TanStack Query, form nhập từ giữ context, và ranh giới Server/Client Component. Dùng khi tạo hoặc sửa code trong frontend/src.
---

# Frontend Next.js — mẫu chuẩn của dự án

> **Phiên bản: Next.js 16** (App Router, Turbopack). API có thể khác dữ liệu huấn luyện của AI.
> Tài liệu chính thức khớp đúng phiên bản nằm sẵn ở `frontend/node_modules/next/dist/docs/` —
> tra ở đó trước khi dùng một API không chắc chắn. `agentRules: false` trong `next.config.ts`
> tắt việc `next dev` tự sinh AGENTS.md/CLAUDE.md trong `frontend/`.

## Ràng buộc quan trọng nhất

**Frontend KHÔNG truy cập database.** Không import `@prisma/client`. Không viết Server
Action đọc DB. Mọi dữ liệu đi qua REST API của NestJS.

Hệ quả thực tế: **hầu hết component trong app này là Client Component** (`'use client'`),
vì chúng cần fetch dữ liệu động và có tương tác. Server Component dùng cho layout, shell,
và phần tĩnh.

Lý do của ràng buộc: giữ khả năng `output: 'export'` thành site tĩnh (S3 + CloudFront,
chi phí gần bằng 0), và giữ business logic tập trung ở một nơi duy nhất.

## Cấu trúc

```
src/
├── app/
│   ├── layout.tsx                    ← Server Component: html, body, Providers
│   ├── page.tsx                      ← Dashboard
│   ├── providers.tsx                 ← 'use client': QueryClientProvider
│   ├── languages/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── vocabulary/
│   │   ├── page.tsx                  ← danh sách + search/filter
│   │   └── new/page.tsx              ← form thêm từ nhanh
│   └── study/
│       ├── flashcard/page.tsx
│       └── quiz/page.tsx
├── components/
│   ├── ui/                           ← shadcn/ui, không sửa tay
│   └── vocabulary/VocabularyForm.tsx
├── lib/
│   ├── api-client.ts                 ← fetch wrapper duy nhất
│   └── query-keys.ts                 ← tập trung query key
└── types/api.ts
```

## API client — một chỗ duy nhất

```ts
// lib/api-client.ts
const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message ?? res.statusText, body);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}
```

**`NEXT_PUBLIC_*` bị nhúng vào bundle và ai cũng đọc được.** Chỉ dùng cho giá trị công khai
như URL API. Không bao giờ đặt secret vào biến có prefix này.

## TanStack Query — mẫu chuẩn

Query key tập trung một chỗ để `invalidate` không bị gõ sai chính tả:

```ts
// lib/query-keys.ts
export const qk = {
  languages: ['languages'] as const,
  language: (id: string) => ['languages', id] as const,
  vocabularies: (filter: object) => ['vocabularies', filter] as const,
};
```

```tsx
'use client';

export function LanguageList() {
  const { data, isLoading, error } = useQuery({
    queryKey: qk.languages,
    queryFn: () => apiFetch<Language[]>('/languages'),
  });

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorState error={error} />;
  if (!data?.length) return <EmptyState action="Thêm ngôn ngữ đầu tiên" />;

  return <>{data.map((l) => <LanguageCard key={l.id} language={l} />)}</>;
}
```

**Luôn xử lý đủ bốn trạng thái: loading, error, empty, có dữ liệu.** Bỏ sót `empty` là lỗi
UX phổ biến nhất — người dùng mới mở app lần đầu sẽ thấy một màn hình trắng không giải thích gì.

Sau mutation phải `invalidateQueries`, nếu không danh sách sẽ hiển thị dữ liệu cũ:

```tsx
const qc = useQueryClient();
const mutation = useMutation({
  mutationFn: (dto: CreateLanguageDto) =>
    apiFetch<Language>('/languages', { method: 'POST', body: JSON.stringify(dto) }),
  onSuccess: () => qc.invalidateQueries({ queryKey: qk.languages }),
});
```

## Form thêm từ nhanh — UX quan trọng nhất của app

Yêu cầu: sau khi lưu một từ, form **giữ lại** Language / Level / Collection và **xóa** các
field còn lại, con trỏ quay về ô `term`. Mục tiêu là nhập 20 từ liên tục không chạm chuột.

```tsx
const form = useForm<VocabularyFormValues>({
  resolver: zodResolver(vocabularySchema),
  defaultValues: { languageId: '', levelId: '', collectionIds: [], term: '', meaning: '' },
});

const mutation = useMutation({
  mutationFn: createVocabulary,
  onSuccess: () => {
    const kept = {
      languageId:    form.getValues('languageId'),
      levelId:       form.getValues('levelId'),
      collectionIds: form.getValues('collectionIds'),
    };
    form.reset({ ...kept, term: '', meaning: '', reading: '', romanization: '',
                 exampleSentence: '', exampleTranslation: '', notes: '' });
    termInputRef.current?.focus();              // ← đừng quên
    qc.invalidateQueries({ queryKey: ['vocabularies'] });
    toast.success('Đã lưu');                    // phản hồi, nhưng không chặn thao tác
  },
});
```

Ba chi tiết dễ quên nhưng quyết định chất lượng UX ở đây:
1. **Trả focus về ô `term`** sau khi lưu.
2. **`Ctrl+Enter` để submit** — tay không rời bàn phím.
3. **Không chặn màn hình bằng modal xác nhận.** Dùng toast, và cho phép Undo trong vài giây.

Các dropdown phụ thuộc nhau: chọn Language → nạp Level của language đó → chọn Level →
lọc Collection. Dùng `enabled` của TanStack Query để không gọi API khi chưa có điều kiện:

```tsx
const { data: levels } = useQuery({
  queryKey: ['levels', languageId],
  queryFn: () => apiFetch<Level[]>(`/languages/${languageId}/levels`),
  enabled: !!languageId,           // ← không có languageId thì không gọi
});
```

## Nguyên tắc UI

Theo `docs/REQUIREMENTS.md`: clean, tối giản, nhanh, responsive, mobile-friendly,
ít animation, điều hướng đơn giản.

Ba hành động phải tới được trong **một lần bấm** từ bất kỳ đâu:
**Add Vocabulary**, **Start Study**, **Review Due Words**.

- Mobile-first: viết layout cho màn hình hẹp trước, rồi mới thêm breakpoint `md:` `lg:`.
  App này sẽ được dùng trên điện thoại khi ôn từ.
- Vùng chạm tối thiểu 44×44px — nút Again/Hard/Good/Easy trong flashcard bấm bằng ngón cái.
- Chữ Hán/Kana cần cỡ chữ lớn hơn chữ Latin để đọc được nét. Dùng class riêng cho ô hiển
  thị từ vựng, đừng để cùng cỡ với text thường.

## Bẫy thường gặp

| Bẫy | Triệu chứng | Cách tránh |
|---|---|---|
| Quên `'use client'` | `useState is not a function`, `You're importing a component that needs useState` | Component có hook hoặc `onClick` → thêm `'use client'` |
| Hydration mismatch | Cảnh báo đỏ trong console | Không render `Date.now()`, `Math.random()`, `localStorage` trong lần render đầu |
| Quên `invalidateQueries` | Thêm từ xong danh sách không cập nhật | Luôn invalidate trong `onSuccess` |
| Query key không ổn định | Fetch vô hạn | Không tạo object mới inline trong queryKey mỗi lần render |
| Gọi API khi thiếu tham số | Request `/levels/undefined` | Dùng `enabled: !!id` |
| Bỏ qua trạng thái empty | Màn hình trắng cho người dùng mới | Luôn có `EmptyState` kèm hành động gợi ý |
