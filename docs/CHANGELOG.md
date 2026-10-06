# CHANGELOG

Định dạng theo [Keep a Changelog](https://keepachangelog.com/).
Mục mới được thêm bởi `/phase-close`.

Ký hiệu Quality Gate: `✅` pass · `⊘` miễn trừ (kèm lý do) · `⚠️` pass có điều kiện

---

> **Từ 2026-10-06:** chủ dự án giao Claude Code tự quyết và tự hoàn thiện MVP, không dừng ở
> G0/G5. Gate ghi `G5 ⊘` nghĩa là *chưa có người chạy thử* — không phải đã đạt. Việc tự
> kiểm tra của con người được dồn về nhóm F11 trong [PLAN.md](PLAN.md).

## [Phase 6] — Vocabulary List — 2026-10-06

### Added
- Trang `/vocabulary`: bảng (desktop) / thẻ (mobile), tìm kiếm debounce 300ms, lọc
  Language → Level → Collection, sắp xếp, phân trang 20 từ/trang
- `useVocabularyQuery`: toàn bộ trạng thái tìm/lọc/trang nằm trên URL
- Sửa / xóa (có xác nhận) trên từng dòng
- Trang collection liệt kê từ của nó bằng chính `VocabularyBrowser` (khóa `collectionId`)
- Link "Từ vựng" trên thanh điều hướng

Quality gates: G1 ✅ G2 ⊘ (không có logic mới ngoài hiển thị; kiểm chứng tay trên trình duyệt) G3 ⊘ G4 ⊘ G5 ⊘

## [Phase 5] — Quick Add Vocabulary — 2026-10-06

### Added
- Môi trường test frontend: Vitest + Testing Library + jsdom
- `VocabularyForm` dùng chung cho tạo và sửa: dropdown phụ thuộc Language → Level →
  Collection (chọn nhiều), nhãn ô theo ngôn ngữ, `Ctrl+Enter`, giữ ngữ cảnh sau khi lưu
- Trang `/vocabulary/new` và `/vocabulary/[id]/edit`
- Nhớ ngữ cảnh lần cuối bằng localStorage; nhận ngữ cảnh qua URL từ trang collection
- Toast cảnh báo trùng từ có link tới từ đã có (không chặn nhập tiếp)
- 15 component test

### Fixed (phát hiện bởi test, trước khi commit)
- Con trỏ không quay về ô "Từ" sau khi lưu: `reset()` của React Hook Form xóa sổ đăng ký
  field nên `setFocus()` gọi ngay sau không có tác dụng → dùng ref riêng
- Bấm hai chip collection liên tiếp có thể mất một lựa chọn (đọc giá trị của lần render cũ)

### Notes
- **F5-11 chưa đánh ✅**: nghiệm thu "tự nhập 20 từ thật" là việc của chủ dự án.

Quality gates: G1 ✅ G2 ✅ G3 ⊘ G4 ⊘ G5 ⊘

## [Phase 4] — Vocabulary API — 2026-10-06

### Added
- Model `Vocabulary` + bảng nối `VocabularyCollection`, migration `add_vocabulary`
- Module `vocabularies`: CRUD, quan hệ N-N với collection, tìm kiếm không phân biệt hoa
  thường trên `term` / `meaning` / `reading` / `romanization`, lọc, `sort` có whitelist
- Cảnh báo mềm `POSSIBLE_DUPLICATE` (201, không phải 409)
- `vocabularyCount` thật cho `/languages` và `/collections` (`_count`)
- Seed mở rộng: 30 từ, 3 ngôn ngữ, level system và collection mẫu (`prisma/seed-data.ts`)
- Test: +17 unit, +42 e2e — gồm test đếm số truy vấn để chứng minh không có N+1

### Changed
- `PrismaService` phát sự kiện `query` (không in log) để test và debug đếm được truy vấn
- `search` tìm thêm cả `romanization` (API.md ban đầu chỉ nêu 3 cột) — gõ "taberu" phải ra 食べる

Quality gates: G1 ✅ G2 ✅ G3 ⊘ G4 ⊘ G5 ⊘

## [Phase 3] — Level Systems, Levels, Collections — 2026-10-06

### Added
- Model `LevelSystem`, `Level`, `Collection` (+ enum `CollectionKind`) và migration
- Module `level-systems`: tạo hệ thống kèm level trong một transaction, một default mỗi
  ngôn ngữ, CRUD level, `POST /level-systems/:id/levels/reorder`
- Module `collections`: CRUD + lọc `languageId` / `levelId` (`null` = xuyên level) / `kind`;
  luật "level phải cùng ngôn ngữ với collection"
- `GET /languages/:id` trả kèm `levelSystems` → `levels`
- Frontend: cây LevelSystem → Level → Collection + nhóm Chủ đề, dialog tạo hệ thống có
  mẫu JLPT/HSK/CEFR, dialog collection, trang `/collections/[id]`
- Test: +26 unit, +37 e2e

### Notes
- Ba bảng mới **không có cột `ownerId`**: quyền sở hữu đi theo `Language`, mọi truy vấn lọc
  qua quan hệ (`where: { language: { ownerId } }`).
- Level của owner khác trả 404 chứ không phải 400 — không để lộ rằng id đó có thật.

Quality gates: G1 ✅ G2 ✅ G3 ⊘ G4 ⊘ G5 ⊘

## [Phase 2] — Language Management — 2026-10-06

### Added
- Backend dùng chung: `OwnerGuard` + `@CurrentUser()`, `PaginationDto` / `paginate()`,
  `AllExceptionsFilter` (mọi lỗi cùng một shape; lỗi Prisma không lọt ra ngoài)
- Model `Language` + migration `add_language`; module `languages` (5 endpoint)
- Seed idempotent (Japanese, Chinese, English) — `npx prisma db seed`
- Frontend: `AppShell` (3 hành động chính luôn hiển thị), trang `/languages`,
  form tạo/sửa (RHF + Zod), xóa có xác nhận, khung trang `/languages/[id]`
- Test: 12 unit test cho `LanguagesService` (bộ mẫu), 26 e2e test

### Notes
- `ownerId` lấy qua guard thay vì đọc `process.env` trong decorator: Phase 12 chỉ thay guard.
- Xóa dùng `deleteMany({ id, ownerId })` — lọc owner ngay trong câu lệnh xóa.

Quality gates: G1 ✅ G2 ✅ G3 ⊘ G4 ⊘ G5 ⊘ (G3/G4 chạy gộp ở F11-03)

## [Phase 1] — Setup & Walking Skeleton — 2026-09-21

### Added
- Docker Compose: Postgres dev (5434) + test (5435, tmpfs)
- NestJS 12 (ESM, Vitest, oxlint), ConfigModule có validate env, ValidationPipe, CORS, Swagger
- Prisma 7 + `PrismaService`; `GET /health`
- Next.js 16 + Tailwind 4 + shadcn/ui + TanStack Query; trang chủ hiển thị trạng thái `/health`
- E2E tự `migrate deploy` lên DB test trước khi chạy; chốt chặn không cho e2e chạm DB dev

### Fixed
- `CORS_ORIGIN` thiếu protocol từng được chấp nhận — nay bị từ chối lúc khởi động

Quality gates: G1 ✅ G2 ✅ G3 ⊘ G4 ⊘ G5 ⊘

## [Phase 0] — Architecture & AI Workflow — 2026-09-18

### Added

**Tài liệu kiến trúc**
- `docs/REQUIREMENTS.md` — yêu cầu chốt, phân định rõ MVP và ngoài MVP
- `docs/ARCHITECTURE.md` — stack, kiến trúc local, phân tầng backend, cấu trúc thư mục
- `docs/DATABASE.md` — thiết kế 8 entity, ERD, ba quyết định thiết kế cốt lõi
- `docs/API.md` — contract cho toàn bộ endpoint dự kiến (chưa implement)
- `docs/DECISIONS.md` — ADR-001 đến ADR-008
- `docs/TESTING.md` — chiến lược test theo tầng
- `docs/TODO.md` — gồm danh sách "TRƯỚC KHI LÊN MẠNG" chặn Phase 13
- `docs/PLAN.md` — 99 task tới MVP, chia theo 12 nhóm chức năng (F0–F11), có tiêu chí
  "Xong khi" cho từng task và nhật ký tiến độ *(thêm 2026-09-19)*
- `CLAUDE.md` — bộ nhớ dài hạn của dự án

**Quy trình AI-assisted**
- `docs/WORKFLOW.md` — vòng lặp một phase, vai trò con người và AI
- `docs/QUALITY_GATES.md` — sáu gate G0-G5 với tiêu chí pass và điều kiện miễn trừ
- `.claude/agents/` — 5 subagent: `architect`, `coder`, `tester`, `reviewer`, `security`
- `.claude/commands/` — `/phase-plan`, `/phase-verify`, `/phase-close`, `/explain`, `/adr`
- `.claude/skills/` — 9 skill tham chiếu: `project-context`, `backend-nestjs`,
  `frontend-nextjs`, `database-prisma`, `api-contract`, `project-testing`,
  `review-checklist`, `security-checklist`, `aws-deploy`
- `.claude/hooks/guard-protected-paths.mjs` — chặn ghi vào `prisma/migrations/`, `.env`,
  `node_modules/`, `components/ui/`, lockfile
- `.claude/settings.json` — hook + permission allow/deny/ask

### Notes

**Quyết định đáng nhớ nhất của phase này**

- *`Collection.levelId` nullable* — một khóa ngoại nullable cho ta cả cây phân cấp
  (`Japanese > N5 > Lesson 3`) lẫn chủ đề xuyên level (`Japanese > Food`), và loại bỏ được
  hoàn toàn nhu cầu về entity `Topic`.
- *`ownerId` từ đầu, bảng `User` để sau* — cái khó khi thêm auth không phải là tạo bảng
  `User`, mà là threading `userId` qua mọi tầng.
- *Không có agent `orchestrator`* — một AI điều phối các AI khác sẽ đẩy con người ra khỏi
  vòng lặp và biến mọi Quality Gate thành hình thức. Orchestration nằm ở slash command
  do con người gõ.

**Điều chỉnh so với bố cục ban đầu do người dùng đề xuất**
- `.claude/settings/quality-gates.md` → tách thành `docs/QUALITY_GATES.md` (tài liệu cho
  người đọc) + `.claude/settings.json` với hook (cưỡng chế bằng máy). Thư mục
  `.claude/settings/` không được công cụ nào đọc.
- Mỗi skill cần file `SKILL.md` bên trong — thư mục rỗng không có tác dụng.
- Bổ sung `.claude/commands/` và `docs/WORKFLOW.md` (không có trong bố cục ban đầu).

### Quality gates
`G0 ✅` — bố cục đã được rà soát và điều chỉnh trước khi tạo file.
`G1-G5 ⊘` — phase tài liệu, chưa có code để build/test/review.
Hook `guard-protected-paths.mjs` đã được **chạy thử và kiểm chứng**: chặn đúng
`prisma/migrations/` và `.env` (exit 2), cho qua `.env.example` và file source (exit 0).

---

<!-- Mục mới thêm phía trên dòng này -->
