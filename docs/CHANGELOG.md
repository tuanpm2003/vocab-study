# CHANGELOG

Định dạng theo [Keep a Changelog](https://keepachangelog.com/).
Mục mới được thêm bởi `/phase-close`.

Ký hiệu Quality Gate: `✅` pass · `⊘` miễn trừ (kèm lý do) · `⚠️` pass có điều kiện

---

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
