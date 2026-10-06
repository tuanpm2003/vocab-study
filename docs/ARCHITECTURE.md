# ARCHITECTURE

> Kiến trúc hệ thống. Thiết kế database ở [DATABASE.md](DATABASE.md), API ở [API.md](API.md),
> lý do đằng sau các quyết định ở [DECISIONS.md](DECISIONS.md).

---

## 1. Stack

| Tầng | Công nghệ |
|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind + shadcn/ui |
| Data fetching | TanStack Query |
| Form | React Hook Form + Zod |
| Backend | NestJS + TypeScript + class-validator + Swagger |
| ORM | Prisma |
| Database | PostgreSQL 16 |
| Local infra | Docker Compose (chỉ chạy PostgreSQL) |

Lý do chọn từng thứ: [DECISIONS.md — ADR-001](DECISIONS.md).

---

## 2. Kiến trúc local

```
                    Browser
                       │  http://localhost:3000
                       ▼
              ┌─────────────────┐
              │     Next.js     │   npm run dev
              │   (port 3000)   │
              └────────┬────────┘
                       │  REST / JSON
                       │  http://localhost:4000
                       ▼
              ┌─────────────────┐
              │     NestJS      │   npm run start:dev
              │   (port 4000)   │
              └────────┬────────┘
                       │  Prisma Client
                       ▼
              ┌─────────────────┐
              │   PostgreSQL    │   docker compose up -d
              │   (port 5434)   │
              └─────────────────┘
```

**Tại sao chỉ PostgreSQL chạy trong Docker?** Hot-reload. Đưa Node vào Docker trên Windows
khiến việc đồng bộ file giữa Windows và container chậm và đôi khi không nhận thay đổi.
Database thì ngược lại — nó không cần hot-reload, và chạy trong Docker giúp không phải cài
PostgreSQL vào Windows, xóa sạch bằng một lệnh, và dễ có nhiều phiên bản.

---

## 3. Ràng buộc kiến trúc quan trọng nhất

> **Next.js KHÔNG bao giờ truy cập database. Next chỉ gọi REST API của NestJS.**

Next.js có khả năng tự truy cập DB (Server Components, Server Actions, Route Handlers).
Dùng khả năng đó **cùng lúc** với NestJS tạo ra **hai tầng backend chồng nhau**: không ai
biết logic nào nằm ở đâu, và frontend không export static được.

Hệ quả tích cực của ràng buộc này:
- Frontend về bản chất là SPA → `output: 'export'` được bất cứ lúc nào → S3 + CloudFront
  với chi phí vài cent/tháng
- Business logic tập trung ở đúng một nơi
- Backend test được độc lập với frontend

Cách kiểm tra ràng buộc: `frontend/` không được import `@prisma/client`, và
`frontend/package.json` không được có `prisma` trong dependencies.

---

## 4. Phân tầng backend

```
Request
   ↓
Controller   — chỉ xử lý HTTP. Không có logic nghiệp vụ, không gọi Prisma.
   ↓
Service      — toàn bộ business logic. Nơi DUY NHẤT gọi Prisma.
   ↓
PrismaService
   ↓
PostgreSQL
```

**Cách tự kiểm tra bạn có phân tầng đúng không:** nếu mai kia thay REST bằng GraphQL, bạn
chỉ phải viết lại Controller. Nếu phải viết lại cả Service, tức là logic đã lọt sai chỗ.

Cross-cutting concern (áp dụng cho mọi request) nằm ở `common/`:

| Thành phần | Việc |
|---|---|
| `ValidationPipe` (global) | Validate mọi DTO, chống mass assignment |
| `PrismaExceptionFilter` | Dịch lỗi Prisma (P2002, P2025...) thành HTTP status đúng |
| `@CurrentUser()` decorator | Cung cấp `ownerId`. Phase 12 đổi thành đọc từ JWT |
| `PaginationDto` | `page` / `limit` dùng chung cho mọi endpoint danh sách |

---

## 5. Cấu trúc thư mục

```
Tieng-Trung-Khong-Kho/
├── CLAUDE.md
├── README.md
├── docker-compose.yml
├── .gitignore
│
├── .claude/                    ← quy trình AI-assisted, xem docs/WORKFLOW.md
│   ├── agents/                 architect, coder, tester, reviewer, security
│   ├── commands/               /phase-plan, /phase-verify, /phase-close, /explain, /adr
│   ├── skills/                 tài liệu tham chiếu nạp theo nhu cầu
│   ├── hooks/                  cưỡng chế bằng máy
│   └── settings.json
│
├── docs/                       ← tài liệu dự án
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   ├── seed.ts             logic seed (idempotent)
│   │   └── seed-data.ts        nội dung seed
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── app.setup.ts        ValidationPipe, filter, CORS — dùng chung cho main.ts và e2e
│   │   ├── config/             validate biến môi trường lúc khởi động
│   │   ├── prisma/             PrismaModule + PrismaService
│   │   ├── common/             DTO chung, exception filter, OwnerGuard + @CurrentUser
│   │   ├── health/             GET /health
│   │   ├── languages/          ← module mẫu cho mọi module khác
│   │   ├── level-systems/      LevelSystem + Level
│   │   ├── collections/
│   │   ├── vocabularies/
│   │   └── learning/           session, review, due, stats
│   │       ├── multiple-choice.ts   ┐ logic nghiệp vụ viết thành HÀM THUẦN:
│   │       ├── progress-rules.ts    ├ không database, không đồng hồ hệ thống,
│   │       └── time-zone.ts         ┘ nên test phủ được mọi nhánh
│   ├── test/
│   └── .env
│
└── frontend/
    ├── src/
    │   ├── app/                App Router: /, /languages, /collections/[id],
    │   │                       /vocabulary, /vocabulary/new, /study, /study/session
    │   ├── components/         theo tính năng: languages/, collections/, vocabulary/,
    │   │                       study/, dashboard/ — và ui/ (shadcn, không sửa tay)
    │   ├── lib/                api-client, api, query-keys, hook, logic phiên học (hàm thuần)
    │   ├── test/               setup và tiện ích cho component test
    │   └── types/              kiểu dữ liệu khớp docs/API.md
    └── .env.local
```

### Tại sao Cách 1 (hai thư mục) thay vì monorepo (`apps/` + `packages/`)

Solo developer, chỉ có hai app. Monorepo tooling (Turborepo, npm workspaces) thêm một lớp
config phải debug mà chưa đem lại lợi ích nào ở quy mô này.

Khi cần chia sẻ type giữa frontend và backend: sinh TypeScript client từ OpenAPI của
NestJS. Nếu sau này thật sự cần workspaces, chuyển đổi mất khoảng 30 phút — đó là chi phí
chấp nhận được để hoãn.

### Quy tắc tạo module

Chỉ tạo module khi phase hiện tại thật sự cần. Không tạo sẵn `auth/`, `users/`,
`statistics/` khi chưa dùng đến. Một module rỗng tạo ảo giác rằng tính năng đó đã tồn tại.

---

## 6. Luồng dữ liệu — ví dụ "thêm một từ vựng"

```
1. Người dùng gõ vào VocabularyForm (frontend/src/components/vocabulary/)
2. React Hook Form + Zod validate phía client   ← chỉ để UX, KHÔNG thay thế backend
3. useMutation gọi apiFetch('/vocabularies', POST)
4. NestJS VocabulariesController nhận request
5. ValidationPipe validate CreateVocabularyDto   ← đây mới là validate thật
6. @CurrentUser() cung cấp ownerId
7. VocabulariesService:
      - kiểm tra language / level / collection thuộc owner và cùng ngôn ngữ
      - kiểm tra từ trùng → chuẩn bị warnings
      - một lệnh create lồng nhau (= một transaction): Vocabulary + các dòng VocabularyCollection
8. Trả 201 { ...vocabulary, warnings: [...] }
9. onSuccess: reset form giữ lại Language/Level/Collection, focus về ô term
10. invalidateQueries → danh sách từ vựng tự cập nhật
```

Validate xuất hiện hai lần (bước 2 và bước 5) là **cố ý**, không phải trùng lặp:
client-side để người dùng biết lỗi ngay không cần chờ mạng; server-side vì client có thể
bị bỏ qua hoàn toàn (ai cũng gửi được request thẳng tới API).

---

## 7. Kiến trúc AWS dự kiến — Phase 13

```
Internet
   │
   ▼
Route 53 ──► CloudFront ──► S3 (Next.js static export)
                 │
                 └── /api/* ──► ALB ──► ECS Fargate (NestJS)
                                            │
                                            ├──► RDS PostgreSQL (private subnet)
                                            ├──► Secrets Manager
                                            └──► CloudWatch Logs
                                       ACM cung cấp chứng chỉ HTTPS
```

**Chưa quyết định.** So sánh ba phương án kèm ước tính chi phí ở skill `aws-deploy`.

Nguyên tắc: **không dùng AWS service chỉ để kiến trúc trông phức tạp.**
Ưu tiên chi phí thấp → đơn giản → learning value.

Điều quan trọng: quyết định hạ tầng **không ảnh hưởng tới code đang viết**. Vì dùng
PostgreSQL chuẩn + Docker + Next static export, app chạy được ở mọi phương án mà không
sửa dòng nào.

---

## 8. Chỗ cắm cho tính năng tương lai

Tính năng AI và giọng nói phải nằm ở **module riêng**, tách biệt với core vocabulary system.
Core phải chạy được khi tắt hoàn toàn AI.

```
backend/src/
├── vocabularies/        ← core, không biết gì về AI
└── ai/                  ← (tương lai) module riêng
    ├── ai.module.ts
    ├── example-generator.service.ts
    ├── quiz-generator.service.ts
    └── tts.service.ts   (Amazon Polly)
```

Cách kết nối: module `ai/` **gọi vào** `vocabularies/` để lấy dữ liệu, chứ `vocabularies/`
không bao giờ import từ `ai/`. Phụ thuộc chỉ đi một chiều. Nhờ vậy, xóa toàn bộ thư mục
`ai/` không làm hỏng core.

Endpoint AI nằm dưới namespace riêng: `POST /ai/generate-example`, `POST /ai/explain`.
