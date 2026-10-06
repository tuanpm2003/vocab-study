# CLAUDE.md — Multi-Language Vocabulary App

> Bộ nhớ dài hạn của dự án. Claude Code tự động đọc file này ở đầu mỗi session.
> File này giữ **những gì luôn cần có trong đầu**; chi tiết nằm ở `docs/`.
> Khi một quyết định thay đổi: cập nhật tài liệu **trước**, rồi mới code.

---

## 0. Bản đồ tài liệu

| Cần biết | Đọc |
|---|---|
| Yêu cầu, phạm vi MVP | [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) |
| Kiến trúc, phân tầng, cấu trúc thư mục | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Thiết kế database, ERD, quan hệ | [docs/DATABASE.md](docs/DATABASE.md) |
| API contract | [docs/API.md](docs/API.md) |
| **Tại sao** một quyết định được đưa ra | [docs/DECISIONS.md](docs/DECISIONS.md) |
| Chiến lược test | [docs/TESTING.md](docs/TESTING.md) |
| **Cách con người và AI làm việc cùng nhau** | [docs/WORKFLOW.md](docs/WORKFLOW.md) |
| **Sáu cửa kiểm soát chất lượng** | [docs/QUALITY_GATES.md](docs/QUALITY_GATES.md) |
| **Kế hoạch tới MVP + tiến độ từng task** | [docs/PLAN.md](docs/PLAN.md) |
| Nợ kỹ thuật, việc hoãn, việc trước khi lên mạng | [docs/TODO.md](docs/TODO.md) |
| Lịch sử thay đổi | [docs/CHANGELOG.md](docs/CHANGELOG.md) |

---

## 1. Dự án là gì?

Web App **cá nhân** để quản lý và ghi nhớ từ vựng **nhiều ngôn ngữ** (Tiếng Trung,
Tiếng Anh, Tiếng Nhật, Tiếng Hàn, và thêm sau này).

```
Mở app → Chọn Language → Chọn Level → Chọn Collection
       → Thêm Vocabulary (liên tục, nhanh) → Save
       → Sau đó: Study (Flashcard / Quiz)
       → Ghi Learning Progress → Dashboard cập nhật
       → Ngày hôm sau: Review những từ cần ôn
```

**Ba hành động quan trọng nhất** — UI phải ưu tiên, tới được trong một lần bấm:
`Add Vocabulary` · `Start Study` · `Review Due Words`

**Ràng buộc:** MVP một người dùng, chạy local. Kiến trúc phải cho phép thêm multi-user,
AI, TTS, Speech Recognition, Spaced Repetition, và deploy AWS **mà không thiết kế lại DB**.

**Mục tiêu song song, quan trọng không kém:** chủ dự án đang **học**. Code chạy được mà
không hiểu được là thất bại, không phải thành công.

---

## 2. Stack

```
Frontend   Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
           TanStack Query + React Hook Form + Zod
Backend    NestJS + TypeScript + class-validator + Swagger
ORM        Prisma
Database   PostgreSQL 16 (Docker)
```

Lý do chọn từng thứ: [docs/DECISIONS.md — ADR-001](docs/DECISIONS.md).

---

## 3. Năm ràng buộc KHÔNG được vi phạm

1. **Next.js không truy cập database.** Không import `@prisma/client` trong `frontend/`.
   Mọi dữ liệu đi qua REST API của NestJS. *(ADR-002)*
2. **Mọi thay đổi schema đi qua Prisma migration.** Không `db push` trên DB có dữ liệu.
3. **Mọi truy vấn dữ liệu người dùng lọc theo `ownerId`** — kể cả khi chỉ có một người dùng.
   Dùng `findFirst({ where: { id, ownerId } })`, không dùng `findUnique({ id })`. *(ADR-006)*
4. **TypeScript strict, không `any`.**
5. **Không hard-code secret.** Mọi cấu hình qua `ConfigService` / biến môi trường.

---

## 4. Ba quyết định database cốt lõi

Chi tiết đầy đủ: [docs/DATABASE.md](docs/DATABASE.md). Tóm tắt để khỏi quên lý do:

**(a) `Collection` thuộc `Language`, `levelId` nullable.**
`Lesson 3` có `levelId = N5` → hiện trong cây. `Food` có `levelId = null` → chủ đề xuyên
level. Một khóa ngoại nullable cho cả hai, và loại bỏ hoàn toàn entity `Topic`. *(ADR-003)*

**(b) `Vocabulary` ↔ `Collection` là Many-to-Many, bảng nối tường minh.**
`食べる` thuộc đồng thời `Lesson 3`, `Food`, `Daily Conversation`. Nếu dùng 1-N phải nhân
bản từ → 3 bản `LearningProgress` → ôn trùng, thống kê sai, sửa nghĩa phải sửa 3 chỗ. *(ADR-004)*

**(c) Một bảng `Vocabulary` cho mọi ngôn ngữ + cột JSONB `extra`.**
Quy tắc: field cần **search/filter/sort** → cột thật; field chỉ để **hiển thị** → `extra`.
`extra` là van xả áp, không phải nơi vứt mọi thứ. *(ADR-005)*

---

## 5. Quy trình làm việc

Đầy đủ: [docs/WORKFLOW.md](docs/WORKFLOW.md) · [docs/QUALITY_GATES.md](docs/QUALITY_GATES.md)

```
/phase-plan <n>   → G0  thiết kế, DỪNG chờ duyệt
                  →     implement (session chính viết, giải thích trước code sau)
/phase-verify     → G1  build + lint
                  → G2  tester   ┐
                  → G3  reviewer ├ chạy song song, ngữ cảnh độc lập
                  → G4  security ┘
                  →     tổng hợp, DỪNG chờ quyết định
                  → G5  CON NGƯỜI tự chạy app, tự đọc code
/phase-close <n>  →     cập nhật tài liệu, CHANGELOG, TODO, commit
```

**Ba quy tắc nền:**
- AI không tự chuyển phase. Con người gõ lệnh, con người là bộ điều phối.
- Code **mới** do session chính viết (để học được). Subagent `coder` chỉ cho việc cơ học
  đã có mẫu.
- Ai viết code thì không tự chấm điểm code đó. `reviewer` và `security` là subagent riêng,
  ngữ cảnh sạch, **chỉ đọc**. *(ADR-008)*

### Cập nhật tiến độ — BẮT BUỘC

[docs/PLAN.md](docs/PLAN.md) là nguồn sự thật về tiến độ. Mỗi task có ID (`F1-05`...).

- **Bắt đầu một task** → đánh 🔄 trong PLAN.md. Mỗi lúc chỉ một task 🔄.
- **Xong một task** (đạt cột "Xong khi", đã chạy thật, có output) → ngay lập tức:
  1. đổi 🔄 → ✅,
  2. cập nhật cột Xong / Tiến độ trong bảng Tổng quan (của nhóm và dòng Tổng),
  3. thêm một dòng vào "Nhật ký tiến độ" (mới nhất ở trên cùng).
- **Không** gom nhiều task rồi cập nhật một lần ở cuối phiên. **Không** đánh ✅ cho task
  mà cột "Xong khi" yêu cầu con người tự kiểm tra (ví dụ F5-11, F11-01), trừ khi con người
  đã xác nhận.
- Task phát sinh → thêm vào cuối nhóm với ID tiếp theo và cập nhật tổng số task.
- Khi trả lời người dùng sau khi xong task, nêu rõ ID task vừa hoàn thành và tiến độ mới.

**Đội ngũ:** `architect` · `coder` · `tester` · `reviewer` · `security`
**Lệnh:** `/phase-plan` · `/phase-verify` · `/phase-close` · `/explain` · `/adr`

---

## 6. Roadmap

| Phase | Nội dung | Trạng thái |
|---|---|---|
| 0 | Kiến trúc, stack, DB, API, quy trình AI-assisted | ✅ |
| 1 | Setup: Docker/Postgres, NestJS, Prisma, Next.js, ESLint, Git, walking skeleton | ✅ |
| 2 | Language Management — lát cắt dọc đầy đủ (module mẫu) | ✅ |
| 3 | LevelSystem + Level + Collection (cùng pattern với Phase 2) | ✅ |
| 4 | Vocabulary CRUD + quan hệ N-N + pagination/search/filter | ✅ |
| 5 | UI thêm từ nhanh (giữ context Language/Level/Collection) | ✅ |
| 6 | Vocabulary list UI: search, filter, sort, phân trang | ✅ |
| 7 | Flashcard | ✅ |
| 8 | Multiple Choice | ✅ |
| 9 | Learning Progress + ReviewLog | ✅ |
| 10 | Dashboard | ✅ |
| 11 | Spaced Repetition (nghiên cứu Leitner/SM-2/FSRS rồi mới chọn) | ⬜ |
| 12 | Authentication (multi-user) | ⬜ |
| 13 | AWS Deployment | ⬜ |

**Ngoài MVP:** AI, TTS, Speech Recognition, SRS phức tạp, multi-user, import/export,
dark mode, PWA, microservices, Kubernetes. Xem
[docs/REQUIREMENTS.md §5](docs/REQUIREMENTS.md).

---

## 7. Nguyên tắc code

1. **Đơn giản trước.** Không tạo abstraction cho thứ mới xuất hiện một lần.
   Không tạo module/bảng/entity chưa dùng đến ở phase hiện tại.
2. **TypeScript strict.** Hạn chế tối đa `any`.
3. **Không hard-code secret.** `.env` (đã gitignore), luôn kèm `.env.example`.
4. **Validate mọi input ở backend.** `ValidationPipe` với `whitelist: true` và
   `forbidNonWhitelisted: true`. Validate ở frontend là để UX, không thay thế backend.
5. **Error handling rõ ràng.** HTTP status đúng nghĩa, không để lỗi Prisma lọt ra ngoài.
6. **Migration đúng cách.** `migrate dev` khi dev, `migrate deploy` khi production.
7. **Cập nhật tài liệu** khi kiến trúc thay đổi — `/phase-close` bắt buộc việc này.
8. **KHÔNG tự ý refactor.** Sửa một feature thì chỉ đụng phần liên quan. Phát hiện ngoài
   phạm vi thì **báo cáo**, không tự sửa.
9. **API không bao giờ trả toàn bộ bảng.** Endpoint danh sách luôn có pagination,
   `limit` có `@Max(100)`.
10. **Comment chỉ để nói ràng buộc mà code không tự thể hiện được**, không mô tả dòng
    code bên dưới đang làm gì.

---

## 8. Git

Solo developer → **không cần nhánh `develop`**. `develop` chỉ có ý nghĩa khi nhiều người
cần một nơi tích hợp trước khi release.

```
main                                    ← luôn chạy được
feature/phase-<n>-<tên-ngắn>            ← một nhánh cho một phase
```

Lợi ích thật sự của việc tách nhánh theo phase: `git diff main...HEAD` cho `reviewer`
**đúng phạm vi** cần xem, không phải toàn bộ codebase.

Commit message theo Conventional Commits, kèm dòng ghi nhận Quality Gate:

```
feat: add language management

- CRUD đầy đủ cho Language
- Đếm số từ vựng bằng _count

Phase 2. Quality gates: G1 ✅ G2 ✅ G3 ✅ G4 ✅ G5 ✅
```

Tiền tố: `feat` · `fix` · `refactor` · `test` · `docs` · `chore`

---

## 9. Môi trường Windows 11

- **PowerShell** là shell chính. Chạy được `npm`, `npx`, `git`, `docker compose`.
- **WSL không bắt buộc.** Docker Desktop dùng WSL2 ở dưới, nhưng lệnh chạy thẳng trong
  PowerShell là đủ.
- PowerShell **không có `&&`**. Nối lệnh: `lệnh1; if ($?) { lệnh2 }`
- Biến môi trường: `$env:DATABASE_URL`, không phải `export`
- PowerShell 5.1 **không hỗ trợ `<`** để redirect stdin từ file.
- Đường dẫn dự án có dấu tiếng Việt (`D:\TIẾNG TRUNG\...`) → luôn bọc trong dấu nháy kép.

| Port | Dịch vụ |
|---|---|
| 3000 | Next.js |
| 4000 | NestJS |
| 5434 | PostgreSQL dev (Docker). 5432 bị PostgreSQL 18 cài sẵn trên Windows chiếm — đừng dùng |
| 5435 | PostgreSQL (test) |
| 5555 | Prisma Studio |

Đã kiểm tra trên máy ngày 2026-09-18: Node v20.19.6 · npm 10.8.2 · Docker 29.1.2 · Git 2.52.0

---

## 10. Mentor Mode

Chủ dự án đang **học**, không chỉ muốn có code chạy được.

### Mỗi Phase trình bày theo đúng 10 mục

```
1. Chúng ta đang xây dựng gì?
2. Tại sao cần xây dựng nó?
3. Kiến thức cần biết trước      ← giải thích khái niệm TRƯỚC khi dùng
4. Files sẽ tạo / thay đổi
5. Code                           ← từng bước nhỏ, giải thích trước, code sau
6. Cách chạy
7. Cách test
8. Kết quả mong đợi               ← mô tả cụ thể sẽ THẤY gì trên màn hình
9. Những lỗi thường gặp
10. Tôi nên hiểu được gì sau Phase này?
```

### Quy tắc bắt buộc

- **Không code toàn bộ app trong một lần.** Đi từng bước:
  Hiểu → Thiết kế → Code → Chạy → Test → Hiểu kết quả → Bước tiếp theo.
- **Không chỉ đưa code.** Mỗi chức năng phải giải thích: xây gì, tại sao cần, tại sao chọn
  giải pháp này, hoạt động ra sao, các thành phần liên kết thế nào, học được gì.
- **Khi có nhiều cách làm:** so sánh ngắn gọn → chọn một → giải thích lý do.
  KHÔNG liệt kê 5 lựa chọn rồi để người dùng tự quyết.
- **Khi gặp lỗi:** (1) nguyên nhân, (2) tại sao xảy ra, (3) cách sửa, (4) cách tránh lần sau.
  Không dán một đoạn code sửa lỗi mà không giải thích.
- **Chờ xác nhận** trước khi bắt đầu một Phase mới.
- **Khi chủ dự án nói "tôi chưa hiểu": dừng phase, giải thích.** Đừng đi tiếp.
  Một phase không hiểu sẽ thành vùng tối trong codebase, và mọi bug ở đó sau này sẽ không
  kiểm chứng được.
