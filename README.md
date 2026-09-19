# Multi-Language Vocabulary App

Web app cá nhân để quản lý và ghi nhớ từ vựng nhiều ngôn ngữ (Tiếng Trung, Tiếng Anh,
Tiếng Nhật, Tiếng Hàn...). Tổ chức từ vựng theo cấu trúc `Language > Level > Collection`,
học bằng Flashcard và Quiz, theo dõi tiến độ trên Dashboard.

> **Trạng thái: Phase 0 hoàn thành (kiến trúc + quy trình).** Chưa có code ứng dụng.
> Phase 1 (Project Setup) là bước tiếp theo.

---

## Stack

| Tầng | Công nghệ |
|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind + shadcn/ui |
| Backend | NestJS + TypeScript |
| Database | PostgreSQL 16 |
| ORM | Prisma |
| Local infra | Docker Compose (PostgreSQL) |

---

## Yêu cầu môi trường

- Node.js ≥ 20
- Docker Desktop
- Git
- Windows 11 + PowerShell (hoặc bất kỳ OS nào — lệnh trong tài liệu viết cho PowerShell)

---

## Cách chạy

> Sẽ được điền ở Phase 1. Dự kiến:

```powershell
# 1. Database
docker compose up -d

# 2. Backend
cd backend
npm install
npx prisma migrate dev
npm run start:dev          # http://localhost:4000

# 3. Frontend (cửa sổ terminal khác)
cd frontend
npm install
npm run dev                # http://localhost:3000
```

---

## Tài liệu

| File | Nội dung |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Tổng quan dự án, ràng buộc, roadmap |
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) | Yêu cầu và phạm vi MVP |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Kiến trúc hệ thống |
| [docs/DATABASE.md](docs/DATABASE.md) | Thiết kế database và ERD |
| [docs/API.md](docs/API.md) | REST API contract |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Architecture Decision Records |
| [docs/TESTING.md](docs/TESTING.md) | Chiến lược test |
| [docs/WORKFLOW.md](docs/WORKFLOW.md) | Quy trình AI-assisted development |
| [docs/QUALITY_GATES.md](docs/QUALITY_GATES.md) | Sáu cửa kiểm soát chất lượng |
| [docs/PLAN.md](docs/PLAN.md) | Kế hoạch tới MVP và tiến độ từng task |
| [docs/TODO.md](docs/TODO.md) | Nợ kỹ thuật, việc hoãn, việc trước khi lên mạng |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | Lịch sử thay đổi |

---

## Quy trình phát triển

Dự án dùng quy trình **AI-assisted có kiểm soát**: mỗi phase đi qua sáu Quality Gate,
trong đó gate cuối (G5) chỉ con người mới xác nhận được. Chi tiết ở
[docs/WORKFLOW.md](docs/WORKFLOW.md).

```
/phase-plan <n>    Lập kế hoạch, dừng chờ duyệt
/phase-verify      Build + test + review chéo + rà soát bảo mật
/phase-close <n>   Cập nhật tài liệu và commit
/explain <gì đó>   Giải thích khái niệm hoặc code
/adr <tiêu đề>     Ghi một quyết định kiến trúc
```
