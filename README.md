# Multi-Language Vocabulary App

Web app cá nhân để quản lý và ghi nhớ từ vựng nhiều ngôn ngữ (Tiếng Trung, Tiếng Anh,
Tiếng Nhật, Tiếng Hàn...). Tổ chức từ vựng theo cấu trúc `Language > Level > Collection`,
học bằng Flashcard và Quiz, theo dõi tiến độ trên Dashboard.

> **Trạng thái:** MVP đã đủ tính năng (Phase 1–10): quản lý ngôn ngữ / level / bài học, thêm từ
> nhanh, danh sách có tìm kiếm và lọc, Flashcard, Trắc nghiệm, tiến độ học, Dashboard.
> Đã có thêm Spaced Repetition (Phase 11, SM-2). Đang chờ chủ dự án nghiệm thu (nhóm F11). Tiến độ chi tiết: [docs/PLAN.md](docs/PLAN.md).

---

## Stack

| Tầng | Công nghệ |
|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind 4 + shadcn/ui + TanStack Query |
| Backend | NestJS 12 (ESM) + TypeScript + class-validator + Swagger |
| Database | PostgreSQL 16 (Docker) |
| ORM | Prisma 7 (driver adapter `pg`) |
| Test | Vitest (backend unit + e2e), Vitest + Testing Library (frontend) |
| Lint | oxlint (backend), ESLint (frontend), Prettier |

Tại sao chọn từng thứ: [docs/DECISIONS.md](docs/DECISIONS.md) (ADR-001, ADR-009).

---

## Yêu cầu môi trường

| Công cụ | Phiên bản | Ghi chú |
|---|---|---|
| Node.js | **≥ 20.19** | Prisma 7 yêu cầu tối thiểu 20.19 |
| Docker Desktop | bất kỳ bản gần đây | chỉ để chạy PostgreSQL |
| Git | bất kỳ | |

Các lệnh bên dưới viết cho **PowerShell** trên Windows. Không cần WSL.

---

## Cài đặt từ đầu

### 1. Database

Ở **thư mục gốc** dự án:

```powershell
docker compose up -d
docker compose ps
```

Cột `STATUS` của cả `vocab-postgres` và `vocab-postgres-test` phải là `healthy`.

| Container | Cổng trên máy | Dùng cho |
|---|---|---|
| `vocab-postgres` | **5434** | dữ liệu thật khi phát triển |
| `vocab-postgres-test` | 5435 | e2e test — dữ liệu nằm trên RAM, mất khi dừng container |

> Cổng dev là **5434, không phải 5432** — xem mục "Xử lý sự cố".

### 2. Backend

```powershell
cd backend
Copy-Item .env.example .env
npm install
npm run start:dev
```

`npm install` tự chạy `prisma generate` (script `postinstall`) để sinh Prisma Client vào
`src/generated/prisma` — thư mục này không được commit.

Kiểm tra:
- http://localhost:4000/health → `{"status":"ok","database":"connected",...}`
- http://localhost:4000/api → Swagger UI

### 3. Frontend

Mở một cửa sổ PowerShell **khác** (backend vẫn đang chạy ở cửa sổ đầu):

```powershell
cd frontend
Copy-Item .env.local.example .env.local
npm install
npm run dev
```

Mở http://localhost:3000 — trang phải hiện màn hình **"Chào mừng"** với ba bước bắt đầu
(database còn trống), hoặc Dashboard nếu đã có từ vựng.

### 4. Dữ liệu mẫu (tùy chọn)

```powershell
cd backend
npx prisma db seed
```

Tạo 3 ngôn ngữ (Japanese, Chinese, English) kèm hệ thống level, vài bài học và 30 từ mẫu.
Chạy lại bao nhiêu lần cũng không tạo bản ghi trùng.

---

## Dùng app

| Việc | Ở đâu |
|---|---|
| Tạo ngôn ngữ, hệ thống level (JLPT/HSK/CEFR…), bài học và chủ đề | **Ngôn ngữ** → chọn một ngôn ngữ |
| Thêm từ liên tục | **Thêm từ** — `Ctrl+Enter` để lưu, ngữ cảnh được giữ lại cho từ kế tiếp |
| Tìm, lọc, sửa, xóa từ | **Từ vựng** |
| Học một phạm vi bất kỳ | **Học** → Flashcard hoặc Trắc nghiệm |
| Ôn những từ **đến hạn hôm nay** | **Ôn tập** (một lần bấm từ mọi trang) — lịch ôn giãn dần theo mức độ nhớ |

Phím tắt khi học: `Space` lật thẻ / sang câu, `1`–`4` chấm điểm hoặc chọn đáp án.

---

## Lệnh thường dùng

| Việc | Backend (`backend/`) | Frontend (`frontend/`) |
|---|---|---|
| Chạy dev | `npm run start:dev` | `npm run dev` |
| Build | `npm run build` | `npm run build` |
| Lint | `npm run lint` | `npm run lint` |
| Kiểm tra format | `npm run format:check` | `npm run format:check` |
| Tự sửa format | `npm run format` | `npm run format` |
| Unit / component test | `npm run test` | `npm run test` |
| E2E test | `npm run test:e2e` (cần container test) | — |
| Xem database | `npx prisma studio` | — |
| Tạo migration sau khi sửa schema | `npx prisma migrate dev --name <ten>` rồi `npx prisma generate` | — |
| Nạp dữ liệu mẫu | `npx prisma db seed` | — |

---

## Xử lý sự cố

**Trang báo "Không kết nối được backend"**
Backend chưa chạy. `cd backend; npm run start:dev`, rồi bấm "Thử lại".

**Trang báo "Có lỗi xảy ra — Lỗi máy chủ", hoặc `/health` trả 503**
Backend chạy nhưng không tới được database. Chạy `docker compose up -d` ở thư mục gốc.
Kiểm tra nhanh: http://localhost:4000/health phải trả `"database":"connected"`.

**`npm run test:e2e` báo không kết nối được database**
Container `vocab-postgres-test` chưa chạy (`docker compose up -d`). Database test nằm trên RAM
nên mất sạch mỗi lần container khởi động lại — e2e tự chạy `prisma migrate deploy` trước khi
test, bạn không cần làm tay.

**Cổng 5432 đã bị chiếm**
Máy phát triển có PostgreSQL 18 cài trực tiếp trên Windows (service `postgresql-x64-18`)
chiếm cổng 5432. Vì vậy dự án dùng **5434**. Nếu `DATABASE_URL` lỡ trỏ về 5432, backend sẽ
kết nối nhầm vào PostgreSQL kia và báo `password authentication failed` — lỗi rất dễ đi tìm
sai chỗ.

**Docker Desktop mở lên rồi tự tắt**
Xem file `%LOCALAPPDATA%\Docker\backend.error.json`. Nếu lỗi nhắc tới
`...\Docker\run\dockerInference` với thông báo "The file cannot be accessed by the system":
thủ phạm là dịch vụ **Docker Model Runner**, thứ dự án này không dùng. Nó cố mở một file socket
cũ đang kẹt, mở không được thì kéo sập cả Docker Desktop. Cách sửa gọn nhất là tắt hẳn dịch vụ đó
thay vì đi xóa file: mở `%APPDATA%\Docker\settings-store.json`, đổi `"EnableDockerAI": true`
thành `false`, rồi mở lại Docker Desktop. (Tương đương với tắt **Settings → AI** trong giao diện
Docker Desktop, nhưng làm được cả khi Docker không mở lên nổi để vào Settings.)

**`docker compose up -d` báo "port is already allocated"**
Một dịch vụ khác trên máy đang giữ cổng đó. Tìm thủ phạm:

```powershell
docker ps --format "{{.Names}}`t{{.Ports}}"
netstat -ano | Select-String ":5435 "
```

Nếu là container của một dự án khác, **đừng tắt nó** — đổi cổng của dự án này trong
`docker-compose.yml` và `backend/.env` sang một cổng rảnh. Dự án không nên buộc phải tắt dự án khác
mới chạy được.

**Backend dừng ngay với "Biến môi trường không hợp lệ"**
Thiếu `backend/.env` hoặc thiếu biến. So sánh với `backend/.env.example`.

**Lint báo `Delete ␍` ở mọi dòng**
File đang dùng xuống dòng kiểu Windows (CRLF). Repo đã ép LF qua `.gitattributes`; chạy
`npm run format` để sửa các file đã có.

**Prisma nhắc "Update available ... prisma@latest"**
Bỏ qua. Dự án ghim Prisma ở `7.10.0` vì tag `latest` đang trỏ tới bản thử nghiệm 8.0 (ADR-009).

---

## Tài liệu

| File | Nội dung |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Tổng quan dự án, ràng buộc, roadmap |
| [docs/PLAN.md](docs/PLAN.md) | Kế hoạch tới MVP và tiến độ từng task |
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) | Yêu cầu và phạm vi MVP |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Kiến trúc hệ thống |
| [docs/DATABASE.md](docs/DATABASE.md) | Thiết kế database và ERD |
| [docs/API.md](docs/API.md) | REST API contract |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Architecture Decision Records |
| [docs/TESTING.md](docs/TESTING.md) | Chiến lược test |
| [docs/WORKFLOW.md](docs/WORKFLOW.md) | Quy trình AI-assisted development |
| [docs/QUALITY_GATES.md](docs/QUALITY_GATES.md) | Sáu cửa kiểm soát chất lượng |
| [docs/TODO.md](docs/TODO.md) | Nợ kỹ thuật, việc hoãn, việc trước khi lên mạng |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | Lịch sử thay đổi |

## Quy trình phát triển

Mỗi phase đi qua sáu Quality Gate; gate cuối (G5) chỉ con người mới xác nhận được.
Chi tiết: [docs/WORKFLOW.md](docs/WORKFLOW.md).

```
/phase-plan <n>    Lập kế hoạch, dừng chờ duyệt
/phase-verify      Build + test + review chéo + rà soát bảo mật
/phase-close <n>   Cập nhật tài liệu và commit
/explain <gì đó>   Giải thích khái niệm hoặc code
/adr <tiêu đề>     Ghi một quyết định kiến trúc
```
