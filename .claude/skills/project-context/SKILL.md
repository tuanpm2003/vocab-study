---
name: project-context
description: Quy ước nền tảng của dự án Multi-Language Vocabulary App — stack, cấu trúc thư mục, lệnh chạy trên Windows, quy tắc đặt tên, và 5 ràng buộc kiến trúc không được vi phạm. Load skill này trước khi viết hoặc review bất kỳ code nào trong dự án.
---

# Ngữ cảnh dự án

App quản lý từ vựng đa ngôn ngữ, dùng cá nhân, chạy local. Chi tiết đầy đủ ở `CLAUDE.md`
và `docs/`. Đây là bản rút gọn để tra nhanh khi đang viết code.

## Stack

```
Frontend   Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
           TanStack Query + React Hook Form + Zod
Backend    NestJS + TypeScript + class-validator + Swagger
ORM        Prisma
Database   PostgreSQL 16 (Docker)
```

## Năm ràng buộc không được vi phạm

1. **Next.js không truy cập database.** Không import `@prisma/client` trong `frontend/`.
   Mọi dữ liệu đi qua REST API của NestJS. Lý do: giữ khả năng export static lên
   S3 + CloudFront, và giữ ranh giới rõ ràng giữa hai tầng.
2. **Mọi thay đổi schema đi qua Prisma migration.** Không `db push` trên database có dữ liệu.
3. **Mọi truy vấn dữ liệu người dùng lọc theo `ownerId`** — kể cả khi MVP chỉ có một người.
   Đây là thứ giữ cho Phase 12 (multi-user) an toàn.
4. **TypeScript strict, không `any`.**
5. **Không hard-code secret.** Mọi cấu hình qua `ConfigService` / biến môi trường.

## Cấu trúc thư mục

```
backend/
  prisma/schema.prisma          ← nguồn sự thật duy nhất của DB
  prisma/migrations/            ← KHÔNG BAO GIỜ sửa tay
  src/
    main.ts                     ← bootstrap, CORS, ValidationPipe, Swagger
    app.module.ts
    prisma/                     ← PrismaModule + PrismaService
    common/                     ← DTO dùng chung, filter, decorator, interceptor
    languages/                  ← mẫu chuẩn cho mọi module khác
    levels/  collections/  vocabulary/  learning/
frontend/
  src/app/                      ← App Router: page.tsx, layout.tsx
  src/components/               ← component tái sử dụng
  src/lib/                      ← api client, query client, utils
  src/types/                    ← type dùng chung
```

Một module NestJS đầy đủ gồm:
```
<tên>/
  <tên>.module.ts
  <tên>.controller.ts       ← chỉ xử lý HTTP, không có business logic
  <tên>.service.ts          ← toàn bộ business logic
  dto/create-<tên>.dto.ts
  dto/update-<tên>.dto.ts
  <tên>.service.spec.ts
```

## Quy ước đặt tên

| Đối tượng | Quy ước | Ví dụ |
|---|---|---|
| File | kebab-case | `create-vocabulary.dto.ts` |
| Class | PascalCase | `VocabularyService` |
| Biến, hàm | camelCase | `findAllByLanguage` |
| Model Prisma | PascalCase số ít | `Vocabulary`, không phải `Vocabularies` |
| Cột Prisma | camelCase | `languageId`, `createdAt` |
| Route URL | kebab-case, danh từ số nhiều | `/level-systems`, `/vocabularies` |
| Biến môi trường | SCREAMING_SNAKE | `DATABASE_URL` |
| Component React | PascalCase | `VocabularyForm.tsx` |
| Hook React | `use` + camelCase | `useVocabularies.ts` |

## Lệnh chạy — Windows 11 / PowerShell

```powershell
# Database (chạy 1 lần, ở thư mục gốc dự án)
docker compose up -d
docker compose ps
docker compose down          # dừng, giữ dữ liệu
docker compose down -v       # dừng, XÓA SẠCH dữ liệu

# Backend (thư mục backend/)
npm run start:dev            # dev server, port 4000
npm run build
npm run lint
npm run test
npx prisma migrate dev --name <ten_migration>
npx prisma studio            # GUI xem database, port 5555
npx prisma generate

# Frontend (thư mục frontend/)
npm run dev                  # port 3000
npm run build
npm run lint
```

**Lưu ý PowerShell:**
- Không có `&&`. Nối lệnh: `lệnh1; if ($?) { lệnh2 }`
- Biến môi trường: `$env:DATABASE_URL`, không phải `export`
- Đường dẫn dự án có dấu tiếng Việt → luôn bọc trong dấu nháy kép

## Port đang dùng

| Port | Dịch vụ |
|---|---|
| 3000 | Next.js |
| 4000 | NestJS |
| 5434 | PostgreSQL dev (Docker) — KHÔNG phải 5432, xem CLAUDE.md §9 |
| 5433 | PostgreSQL test (Docker) |
| 5555 | Prisma Studio |

## Nguyên tắc làm việc

- **Đơn giản trước.** Không tạo abstraction cho thứ mới xuất hiện một lần.
- **Không tự ý refactor.** Khi được yêu cầu sửa một feature, chỉ đụng vào phần liên quan.
- **Không tạo module/bảng/entity chưa dùng đến ở phase hiện tại.**
- **Comment chỉ để nói ràng buộc mà code không tự thể hiện được**, không mô tả dòng dưới
  đang làm gì.
