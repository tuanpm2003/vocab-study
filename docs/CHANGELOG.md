# CHANGELOG

Định dạng theo [Keep a Changelog](https://keepachangelog.com/).
Mục mới được thêm bởi `/phase-close`.

Ký hiệu Quality Gate: `✅` pass · `⊘` miễn trừ (kèm lý do) · `⚠️` pass có điều kiện

---

> **Từ 2026-10-06:** chủ dự án giao Claude Code tự quyết và tự hoàn thiện MVP, không dừng ở
> G0/G5. Gate ghi `G5 ⊘` nghĩa là *chưa có người chạy thử* — không phải đã đạt. Việc tự
> kiểm tra của con người được dồn về nhóm F11 trong [PLAN.md](PLAN.md).

## [Sau nghiệm thu] — Phản hồi hover cho mọi nút — 2026-10-07

Phản hồi của chủ dự án sau khi tự chạy thử: nút bấm không có hiệu ứng hover.

### Fixed
- Tailwind 4 để con trỏ mặc định (mũi tên) trên `<button>` → quy tắc chung trong
  `globals.css`: con trỏ `pointer` cho mọi nút, link, select, nhãn radio đang bật;
  `not-allowed` cho phần tử bị khóa
- Mọi `<button>` và link kiểu nút: tối nhẹ + đổ bóng khi rê chuột, lún 1px khi nhấn — đặt ở
  tầng base nên nút viết sau này tự có, không phải nhớ thêm class
- Utility `pressable` cho link/thẻ đóng vai trò nút (thẻ hành động và ô trạng thái trên
  Dashboard, nút trên thanh điều hướng, lựa chọn chế độ học)
- Nút nền đen (chip đã chọn, hành động chính) sáng lên khi hover — làm tối thêm không nhìn ra
- Hiệu ứng bọc trong `@media (hover: hover)` để không "dính" trên màn hình cảm ứng

## [Nghiệm thu MVP — G3 + G4 trên toàn bộ codebase] — 2026-10-06

Rà soát chéo bằng hai subagent chỉ-đọc, ngữ cảnh độc lập (`reviewer`, `security`).
**G3: PASS có điều kiện → đã sửa hết.** 0 nghiêm trọng, 1 cao, 4 trung bình, 4 thấp.
**G4: PASS có điều kiện → đã đáp ứng.** 0/53 lời gọi Prisma không an toàn về `ownerId`.

### Fixed
- **[CAO] Ô tìm kiếm mất focus sau mỗi lần debounce** — `key={query.search}` làm ô bị dựng
  lại ngay giữa lúc đang gõ. Bỏ `key`; ô tự phân biệt giá trị dội về từ chính nó với giá trị
  đổi từ bên ngoài.
- Form từ vựng âm thầm gỡ từ khỏi bài học nằm ngoài 100 bài đầu tiên được tải
- `POST /learning/review`: hai lần ôn đồng thời cùng một từ có thể mất một lần đếm → khóa
  dòng bằng `SELECT … FOR UPDATE`; frontend gửi kết quả ôn lần lượt, đúng thứ tự
- `null` ở field bắt buộc trả 500 thay vì 400 (`PartialType` mặc định bỏ qua `null`)
- Phím tắt phiên học nuốt Enter/Space trên nút và link đang focus (nút "Học phiên mới"
  không bấm được bằng bàn phím)
- `Ctrl+Enter` hai lần liền tạo hai từ trùng nhau
- Tìm kiếm với `%` hoặc `_` khớp mọi từ (Prisma không escape ký tự đại diện của LIKE)
- Xóa ngôn ngữ / đổi tên level, bài học không làm mới danh sách từ vựng
- `page` và `order` không có trần → số quá lớn thành lỗi 500

### Security
- `next` 16.3.5 → **16.3.6** (GHSA-vcvr-r3jv-pc5j, RCE trong `next/og`; app không dùng `next/og`)
- Hai lệnh ghi (`reorderLevels`, `upsert` LearningProgress) nay lọc owner ngay trong `where`
- Frontend `encodeURIComponent` mọi id khi ghép vào đường dẫn API
- `shadcn` (công cụ CLI) chuyển sang `devDependencies`

### Added
- 17 e2e test hồi quy (`test/hardening.e2e-spec.ts`), 11 test frontend
- Quy ước về `null` trong body (docs/API.md); 10 mục mới trong docs/TODO.md

Tổng test sau nghiệm thu: backend unit 148 · e2e 179 · frontend 52.
Quality gates: G1 ✅ G2 ✅ G3 ✅ G4 ✅ G5 ⬜ (chờ chủ dự án)

## [Phase 10] — Dashboard — 2026-10-06

### Added
- ADR-011: "hôm nay" tính theo `APP_TIMEZONE` (biến môi trường mới, có mặc định)
- `GET /learning/stats`; `learning/time-zone.ts` (`dayRange`, `countStreak` — hàm thuần)
- Dashboard thay cho trang walking skeleton: 3 hành động chính, số liệu hôm nay, chuỗi ngày
  học, kho từ theo trạng thái; hướng dẫn 3 bước cho người dùng mới
- Test: +27 unit, +11 e2e, +6 frontend

### Removed
- Component `HealthStatus` của Phase 1 (trang chủ nay là Dashboard; lỗi kết nối backend
  vẫn được báo kèm cách khắc phục)

### Notes
- `stats` không nhận `from`/`to` như bản thiết kế Phase 0 — chưa có màn hình nào cần.
- Mốc ngày truyền vào SQL dưới dạng chuỗi UTC ép `::timestamp`, để phép so sánh không phụ
  thuộc múi giờ của phiên kết nối Postgres.

Quality gates: G1 ✅ G2 ✅ G3 ⊘ G4 ⊘ G5 ⊘

## [Phase 9] — Learning Progress & Review Log — 2026-10-06

### Added
- ADR-010: quy tắc chuyển trạng thái theo chuỗi trả lời đúng liên tiếp
- Model `LearningProgress`, `ReviewLog` + enum; migration
- `POST /learning/review` (transaction), `GET /learning/due`
- `progress` trong mọi response từ vựng; `GET /vocabularies?status=`
- Frontend: ghi kết quả ôn ngầm (`useReviewRecorder`), nút **Ôn tập**, nhãn trạng thái,
  bộ lọc trạng thái, khối Tiến độ ở trang sửa từ
- Test: +28 unit, +27 e2e

### Changed
- `LearningProgress` có thêm cột `correctStreak` (ngoài thiết kế Phase 0 — xem ADR-010)
- `ReviewLog.isCorrect` luôn được ghi, kể cả với flashcard (suy từ `rating`)

### Fixed
- **Ép kiểu boolean ngầm:** `enableImplicitConversion` biến chuỗi `"false"`/`"yes"` thành
  `true` trước khi `@IsBoolean` chạy. Field boolean trong body (`isCorrect`, `isDefault`) nay
  dùng `@Transform(rawValue)` để validate giá trị gốc.

### Notes
- Query key của phiên học nằm ở gốc `study-session`, tách khỏi `learning`: ghi một lần ôn
  invalidate `learning`, và bộ thẻ đang học không được refetch theo.

Quality gates: G1 ✅ G2 ✅ G3 ⊘ G4 ⊘ G5 ⊘

## [Phase 8] — Multiple Choice — 2026-10-06

### Added
- `GET /learning/session?mode=multiple_choice&questionType=term_to_meaning|meaning_to_term`
- `learning/multiple-choice.ts`: sinh câu hỏi 4 lựa chọn bằng hàm thuần (20 unit test)
- `QuizSession` + tổng kết có danh sách từ trả lời sai; hai chế độ quiz trong trang `/study`
- Test: +20 unit, +8 e2e, +9 frontend

### Notes
- Từ **đồng tự** với từ đang hỏi (行 "đi" / 行 "hàng") bị loại khỏi đáp án nhiễu: nghĩa của nó
  cũng là một đáp án đúng.
- Phạm vi hẹp (một bài 2 từ) vẫn làm quiz được: đáp án nhiễu lấy từ cả ngôn ngữ, không chỉ
  từ trong phạm vi.

Quality gates: G1 ✅ G2 ✅ G3 ⊘ G4 ⊘ G5 ⊘

## [Phase 7] — Flashcard — 2026-10-06

### Added
- Module `learning` + `GET /learning/session?mode=flashcard` (ngẫu nhiên trong database)
- Trang `/study` (chọn phạm vi) và `/study/session`
- `FlashcardSession`: lật thẻ, chấm 4 mức, thẻ "Quên" quay lại cuối hàng đợi, tổng kết
- Logic phiên học là hàm thuần (`lib/flashcard-session.ts`); hook `useHotkeys`
- Test: 11 e2e + 11 frontend

### Notes
- Bộ thẻ của một phiên không bao giờ refetch (`staleTime: Infinity`): backend trả thứ tự
  ngẫu nhiên nên refetch giữa phiên sẽ đổi thẻ dưới tay người học.
- Ở phase này kết quả **chưa được lưu** — nối vào ở Phase 9.

Quality gates: G1 ✅ G2 ✅ G3 ⊘ G4 ⊘ G5 ⊘

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
