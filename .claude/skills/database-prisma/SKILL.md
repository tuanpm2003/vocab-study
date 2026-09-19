---
name: database-prisma
description: Quy ước Prisma schema và quy trình migration của dự án — cách khai báo quan hệ 1-1, 1-N, N-N, dùng JSONB cho field linh hoạt, đặt index, và xử lý sự cố migration. Dùng khi sửa schema.prisma hoặc viết truy vấn Prisma.
---

# Prisma — quy ước và quy trình

Thiết kế database đầy đủ ở `docs/DATABASE.md`. Đây là phần thao tác.

## Quy trình migration — thứ tự bắt buộc

```powershell
# 1. Sửa backend/prisma/schema.prisma
# 2. Sinh migration + áp vào DB dev + sinh lại Prisma Client
npx prisma migrate dev --name add_vocabulary_table
# 3. Kiểm chứng bằng mắt
npx prisma studio
```

**Quy tắc cứng:**

- **Không bao giờ sửa file trong `prisma/migrations/`.** File migration đã sinh ra là
  lịch sử đã xảy ra. Muốn đổi → tạo migration mới.
- **Không dùng `prisma db push` trên database có dữ liệu bạn quan tâm.** `db push` đồng
  bộ schema mà không tạo file migration — bạn mất lịch sử và không deploy lên môi trường
  khác được.
- Tên migration mô tả **hành động**: `add_learning_progress`, `make_collection_level_nullable`.
  Không đặt `update`, `fix`, `new`.
- Sau khi `git pull` có migration mới: chạy `npx prisma migrate dev` rồi `npx prisma generate`.

**Khi migration kẹt ở dev** (schema drift, migration failed):
```powershell
npx prisma migrate reset     # XÓA SẠCH dữ liệu dev rồi chạy lại từ đầu
```
Lệnh này an toàn ở local vì dữ liệu dev có thể tạo lại bằng seed. **Không bao giờ chạy
trên production** — Phase 13 dùng `npx prisma migrate deploy`.

## Ba loại quan hệ — cách khai báo

### One-to-Many (1-N)

```prisma
model Language {
  id     String  @id @default(cuid())
  name   String
  levels Level[]                              // phía "nhiều"
}

model Level {
  id         String   @id @default(cuid())
  name       String
  languageId String                            // khóa ngoại nằm ở phía "nhiều"
  language   Language @relation(fields: [languageId], references: [id], onDelete: Cascade)

  @@index([languageId])                        // LUÔN index khóa ngoại
}
```

`onDelete` quyết định chuyện gì xảy ra khi xóa cha:
- `Cascade` — xóa luôn con. Dùng khi con **không có ý nghĩa** nếu thiếu cha
  (xóa Language thì Level của nó vô nghĩa).
- `Restrict` — chặn không cho xóa cha khi còn con. Dùng khi muốn người dùng xác nhận.
- `SetNull` — cần trường khóa ngoại là nullable.

Trong dự án này: xóa Language → `Cascade` toàn bộ. Xóa Level → `SetNull` cho
`Collection.levelId` và `Vocabulary.levelId` (từ vựng không được biến mất chỉ vì bạn
xóa một level).

### One-to-One (1-1)

```prisma
model Vocabulary {
  id       String            @id @default(cuid())
  progress LearningProgress?
}

model LearningProgress {
  id           String     @id @default(cuid())
  vocabularyId String     @unique              // ← @unique biến 1-N thành 1-1
  vocabulary   Vocabulary @relation(fields: [vocabularyId], references: [id], onDelete: Cascade)
}
```

Ở Phase 12 (multi-user), đổi `@unique` trên một cột thành `@@unique([vocabularyId, ownerId])`
là biến 1-1 thành "1-1 theo từng người dùng". Đây là lý do `LearningProgress` được tách
khỏi `Vocabulary` ngay từ đầu.

### Many-to-Many (N-N) — khai báo TƯỜNG MINH

```prisma
model Vocabulary {
  id          String                 @id @default(cuid())
  collections VocabularyCollection[]
}

model Collection {
  id           String                 @id @default(cuid())
  vocabularies VocabularyCollection[]
}

model VocabularyCollection {
  vocabularyId String
  collectionId String
  addedAt      DateTime   @default(now())

  vocabulary   Vocabulary @relation(fields: [vocabularyId], references: [id], onDelete: Cascade)
  collection   Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)

  @@id([vocabularyId, collectionId])           // khóa chính kép
  @@index([collectionId])
}
```

**Tại sao tường minh thay vì `Vocabulary[]` / `Collection[]` ngầm?** Vì bảng nối ngầm
không cho thêm cột. Ta đã cần `addedAt` ngay bây giờ, và có thể cần `orderInLesson`
sau này. Chuyển từ ngầm sang tường minh về sau là một migration khó chịu trên dữ liệu thật.

Thao tác:
```ts
// Thêm một từ vào nhiều collection cùng lúc
await this.prisma.vocabulary.create({
  data: {
    ...dto,
    collections: { create: collectionIds.map((collectionId) => ({ collectionId })) },
  },
});

// Đổi toàn bộ danh sách collection của một từ
await this.prisma.$transaction([
  this.prisma.vocabularyCollection.deleteMany({ where: { vocabularyId: id } }),
  this.prisma.vocabularyCollection.createMany({
    data: collectionIds.map((collectionId) => ({ vocabularyId: id, collectionId })),
  }),
]);
```

Phải bọc trong `$transaction`: nếu xóa xong mà thêm lỗi, từ vựng sẽ mất hết collection.

## JSONB — cột `extra`

```prisma
model Vocabulary {
  extra Json?     // PostgreSQL: Prisma map Json → jsonb
}
```

**Quy tắc quyết định:** field cần **search/filter/sort** → cột thật.
Field chỉ để **hiển thị** → `extra`.

Prisma trả `extra` với kiểu `Prisma.JsonValue` — TypeScript **không biết** bên trong có gì.
Luôn validate bằng Zod trước khi dùng:

```ts
const JapaneseExtra = z.object({
  kanji: z.string().optional(),
  verbGroup: z.enum(['ichidan', 'godan', 'irregular']).optional(),
});
const parsed = JapaneseExtra.safeParse(vocab.extra);
```

Giới hạn kích thước `extra` ở tầng DTO (ví dụ 4KB) — nếu không, một payload JSON khổng lồ
sẽ chui thẳng vào database.

## Index — đặt ở đâu

Đặt index cho:
- **Mọi khóa ngoại** (`languageId`, `levelId`, `collectionId`, `vocabularyId`).
  PostgreSQL **không** tự tạo index cho khóa ngoại — khác với khóa chính.
- Cột dùng trong `where` thường xuyên: `ownerId`, `status`, `dueAt`.
- Cột dùng trong `orderBy`: `createdAt`.
- Tổ hợp hay dùng chung: `@@index([languageId, term])` cho tra cứu từ trùng.

Đừng index mọi cột. Mỗi index làm ghi chậm đi và tốn dung lượng. Chỉ index khi có truy vấn
thật sự dùng tới nó.

## Seed

`backend/prisma/seed.ts` tạo dữ liệu mẫu để dev không phải nhập tay sau mỗi lần reset:
một owner local, 2-3 ngôn ngữ, level system JLPT + HSK, vài collection và vài từ.

```powershell
npx prisma db seed
```

Seed phải **idempotent** — chạy nhiều lần không tạo trùng. Dùng `upsert` thay vì `create`.

## Bẫy thường gặp

| Bẫy | Cách tránh |
|---|---|
| Sửa schema xong không thấy type mới | Chạy `npx prisma generate` (hoặc `migrate dev` đã tự chạy) |
| `findUnique` không lọc được `ownerId` | Dùng `findFirst({ where: { id, ownerId } })` |
| Đếm quan hệ bằng cách load hết rồi `.length` | Dùng `_count: { select: { vocabularies: true } }` |
| Quên index khóa ngoại → truy vấn chậm dần | Luôn thêm `@@index([<khóa ngoại>])` |
| `Decimal`/`BigInt` không serialize được sang JSON | Dự án này không dùng; nếu cần thì `.toString()` |
| Xóa cha làm mất dữ liệu ngoài ý muốn | Cân nhắc kỹ `onDelete` cho từng quan hệ |
