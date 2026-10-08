# PLAN — Kế hoạch tới MVP

> Danh sách **mọi task cần làm để đạt MVP**, sắp xếp theo **chức năng của hệ thống**.
> Đây là file theo dõi tiến độ chính của dự án.
>
> Yêu cầu gốc: [REQUIREMENTS.md](REQUIREMENTS.md) · Phase nào làm chức năng nào: bảng Roadmap trong [CLAUDE.md](../CLAUDE.md)

---

## Quy tắc cập nhật

1. **Task chỉ được đánh ✅ khi đạt cột "Xong khi"**, không phải khi viết xong code.
   "Xong khi" luôn là thứ **quan sát được**: lệnh chạy ra kết quả, test pass, màn hình hiển thị đúng.
2. Sau **mỗi** task xong: đổi trạng thái của task → cập nhật bảng **Tổng quan** → thêm một dòng vào **Nhật ký tiến độ** ở cuối file.
3. Đang làm → 🔄. Mỗi lúc chỉ có **một** task 🔄. Nhiều task dang dở cùng lúc thường nghĩa là không task nào thật sự xong.
4. **Không xóa task.** Task bị bỏ → ⏸️ kèm lý do trong cột "Xong khi". Task mới phát sinh → thêm vào cuối nhóm với ID tiếp theo.
5. Chức năng chỉ được coi là xong khi **tất cả task ✅ và đã qua Quality Gate** (cột Gate trong bảng Tổng quan).

Ký hiệu: ⬜ chưa làm · 🔄 đang làm · ✅ xong · ⏸️ hoãn hoặc bỏ

Tầng: `DB` database/Prisma · `BE` NestJS · `FE` Next.js · `Test` · `Infra` Docker/Git/tooling · `Docs`

### PLAN.md khác TODO.md và CHANGELOG.md thế nào

| File | Trả lời câu hỏi |
|---|---|
| **PLAN.md** | Cần làm gì để tới MVP, và đã làm tới đâu? |
| [TODO.md](TODO.md) | Nợ kỹ thuật, việc hoãn có chủ đích, việc phải làm trước khi lên mạng |
| [CHANGELOG.md](CHANGELOG.md) | Mỗi phase đã thay đổi những gì? (ghi khi đóng phase) |

---

## Tổng quan

Phase 0 (kiến trúc + quy trình AI) đã xong và không tính vào bảng này. Xem [CHANGELOG.md](CHANGELOG.md).

| # | Chức năng | Phase | Yêu cầu | Task | Xong | Tiến độ | Gate |
|---|---|:---:|---|:---:|:---:|:---:|:---:|
| F0 | Nền tảng dự án | 1 | §4 | 13 | 13 | 100% | G1✅ G2✅ G5⬜ |
| F1 | Quản lý ngôn ngữ | 2 | §3.1 | 14 | 14 | 100% | G1✅ G2✅ G5⬜ |
| F2 | Hệ thống level | 3 | §3.2 | 7 | 7 | 100% | G1✅ G2✅ G5⬜ |
| F3 | Collection | 3 | §3.3 | 7 | 7 | 100% | G1✅ G2✅ G5⬜ |
| F4 | Từ vựng (backend) | 4 | §3.4, §3.9 | 9 | 9 | 100% | G1✅ G2✅ G5⬜ |
| F5 | Thêm từ nhanh | 5 | §3.5 | 11 | 10 | 91% | G1✅ G2✅ G5⬜ |
| F6 | Danh sách, tìm kiếm, lọc | 6 | §3.9 | 8 | 8 | 100% | G1✅ G2✅ G5⬜ |
| F7 | Flashcard | 7 | §3.6 | 6 | 6 | 100% | G1✅ G2✅ G5⬜ |
| F8 | Trắc nghiệm | 8 | §3.6 | 4 | 4 | 100% | G1✅ G2✅ G5⬜ |
| F9 | Learning Progress | 9 | §3.7 | 9 | 9 | 100% | G1✅ G2✅ G5⬜ |
| F10 | Dashboard | 10 | §3.8 | 5 | 5 | 100% | G1✅ G2✅ G5⬜ |
| F11 | Nghiệm thu MVP | — | §6 | 6 | 2 | 33% | G3✅ G4✅ G5⬜ |
| F12 | Spaced Repetition | 11 | Ngoài MVP | 6 | 6 | 100% | G1✅ G2✅ G5⬜ |
| F13 | Authentication | 12 | Ngoài MVP | 9 | 9 | 100% | G1✅ G2✅ G4✅ G5⬜ |
| F14 | AWS Deployment | 13 | Ngoài MVP | 13 | 6 | 46% | G1✅ |
| | **Tổng** | | | **127** | **115** | **91%** | |

Cột Gate ghi kết quả khi đóng phase, ví dụ `G1✅ G2✅ G3✅ G4✅ G5✅`. Hai chức năng cùng Phase 3 (F2, F3) dùng chung một dòng Gate.

> **Từ 2026-10-06** chủ dự án giao Claude Code tự hoàn thiện MVP, không dừng ở G0/G5 từng phase.
> Vì vậy **G3 + G4 chạy gộp một lần trên toàn bộ codebase** (F11-03, kết quả ghi ở dòng F11),
> và **G5 của mọi phase còn ⬜** — chỉ chủ dự án tự chạy app, tự đọc code mới đánh ✅ được (F11-01).

---

## F0 — Nền tảng dự án · Phase 1

**Mục tiêu:** một "walking skeleton" (bộ khung chạy được): trình duyệt → Next.js → NestJS → PostgreSQL chạy thông suốt, dù chưa có tính năng nào.
**Phụ thuộc:** không.

| ID | Task | Tầng | Xong khi | TT |
|---|---|---|---|:---:|
| F0-01 | `git init`, `.gitignore` (node_modules, .env, dist, .next), commit tài liệu Phase 0 | Infra | `git log` có commit đầu tiên; `git check-ignore backend/.env` xác nhận `.env` bị bỏ qua | ✅ |
| F0-02 | `docker-compose.yml`: Postgres dev (5434 — 5432 đã bị PostgreSQL 18 cài sẵn chiếm) + test (5435), bind `127.0.0.1`, có volume | Infra | `docker compose ps` cho thấy cả hai container healthy | ✅ |
| F0-03 | Khởi tạo NestJS trong `backend/`, TypeScript strict | BE | `npm run start:dev` chạy, `http://localhost:4000` phản hồi | ✅ |
| F0-04 | `ConfigModule` + `.env` / `.env.example` (`DATABASE_URL`, `PORT`, `LOCAL_OWNER_ID`, `CORS_ORIGIN`) | BE | App đọc cấu hình từ env; grep không thấy secret nào trong `src/` | ✅ |
| F0-05 | `ValidationPipe` toàn cục (`whitelist`, `forbidNonWhitelisted`, `transform`), CORS cho `localhost:3000`, Swagger | BE | Swagger UI mở được tại `/api` | ✅ |
| F0-06 | Cài Prisma, `PrismaModule` + `PrismaService` (có shutdown hook) | DB | `npx prisma validate` pass; app kết nối được DB khi khởi động | ✅ |
| F0-07 | `GET /health` kiểm tra kết nối DB bằng `SELECT 1` | BE | Trả 200 `{status:"ok", database:"connected"}`; tắt Docker → trả 503 | ✅ |
| F0-08 | Cấu hình Vitest cho unit + e2e (e2e dùng DB test 5435, có chốt chặn không cho chạy nhầm vào DB dev) — ADR-009 | Test | `npm run test` và `npm run test:e2e` đều chạy, test `/health` pass | ✅ |
| F0-09 | Khởi tạo Next.js trong `frontend/` (App Router, TS strict, Tailwind) | FE | `npm run dev` chạy tại `http://localhost:3000` | ✅ |
| F0-10 | shadcn/ui + TanStack Query provider + `lib/api-client.ts` (`ApiError`) + `.env.local.example` | FE | Build pass; `apiFetch` gọi được backend | ✅ |
| F0-11 | Walking skeleton: trang chủ gọi `/health` và hiển thị trạng thái | FE | Trình duyệt hiện "Backend: ok · DB: connected"; tắt backend → hiện thông báo lỗi dễ hiểu | ✅ |
| F0-12 | Linter + Prettier: backend oxlint, frontend ESLint (ADR-009); `no-floating-promises` và `no-explicit-any` = error | Infra | `npm run lint` pass ở cả `backend/` và `frontend/` | ✅ |
| F0-13 | README: hướng dẫn cài đặt từ đầu | Docs | Làm theo README trên một thư mục clone mới → app chạy được | ✅ |

> **Docker đã gỡ được (2026-09-21).** Nguyên nhân thật không phải file socket kẹt mà là dịch vụ
> Docker Model Runner: đặt `"EnableDockerAI": false` trong `%APPDATA%\Docker\settings-store.json`
> là Docker khởi động bình thường (README → "Xử lý sự cố"). Cổng DB test đổi 5433 → **5435**
> vì container Postgres của một dự án khác đang giữ 5433.
>
> **Còn lại của Phase 1:**
> - ~~F0-08~~ ✅ — đã sửa `TEST_DATABASE_URL` trong `backend/.env` sang `5435`; unit 2/2, e2e 1/1 pass
> - ~~F0-13~~ ✅ — README đã kiểm chứng trên bản clone mới
> - G3/G4 của mọi phase được chạy gộp một lần trên toàn bộ codebase ở F11-03; G5 dồn về F11-01

---

## F1 — Quản lý ngôn ngữ · Phase 2

**Mục tiêu:** CRUD ngôn ngữ đầy đủ từ database tới giao diện. **Đây là module mẫu**: mọi module sau sẽ sao chép pattern của nó, nên đáng đầu tư làm tử tế.
**Phụ thuộc:** F0.

| ID | Task | Tầng | Xong khi | TT |
|---|---|---|---|:---:|
| F1-01 | Decorator `@CurrentUser()` trả `ownerId` từ `LOCAL_OWNER_ID` | BE | Controller nhận được `ownerId`; không có chỗ nào đọc `process.env` trực tiếp trong service | ✅ |
| F1-02 | `PaginationDto` (`page` ≥1, `limit` 1–100) + kiểu response `{items,total,page,limit,totalPages}` | BE | `limit=101` → 400; `page=0` → 400 | ✅ |
| F1-03 | `PrismaExceptionFilter`: P2002→409, P2025→404, P2003→409; lỗi có shape thống nhất | BE | Lỗi trả ra không chứa tên bảng, câu SQL, stack trace | ✅ |
| F1-04 | Model `Language` + migration `add_language` (`@@unique([ownerId, name])`) | DB | Migration chạy; Prisma Studio thấy bảng `Language` | ✅ |
| F1-05 | `LanguagesService`: findAll (phân trang), findOne, create, update, remove — tất cả lọc `ownerId` | BE | Mọi lời gọi Prisma có `ownerId` trong `where` | ✅ |
| F1-06 | Controller + DTO + Swagger: `GET/POST /languages`, `GET/PATCH/DELETE /languages/:id` | BE | Thử được cả 5 endpoint trên Swagger với đúng status code (200/201/204) | ✅ |
| F1-07 | Unit test service (mock `PrismaService`) — **bộ test mẫu** | Test | Mỗi method có happy path + ít nhất một nhánh lỗi; tất cả pass | ✅ |
| F1-08 | E2E test: CRUD, 400 (thiếu field, field lạ), 404, 409 trùng tên, cách ly `ownerId`, Unicode | Test | Tất cả pass trên DB test | ✅ |
| F1-09 | Seed idempotent: Japanese, Chinese, English | DB | Chạy `npx prisma db seed` hai lần không tạo bản ghi trùng | ✅ |
| F1-10 | App shell: layout, thanh điều hướng có 3 hành động chính (tạm để trạng thái "sắp có" cho tới khi tính năng tồn tại), responsive | FE | Ở màn hình 375px, điều hướng dùng được và 3 nút chính luôn nhìn thấy | ✅ |
| F1-11 | Trang `/languages`: danh sách card (tên + số từ); đủ 4 trạng thái loading / error / empty / có dữ liệu | FE | Thấy được cả 4 trạng thái (tắt backend để xem trạng thái lỗi) | ✅ |
| F1-12 | Form tạo/sửa ngôn ngữ (React Hook Form + Zod), hiển thị lỗi 409 từ backend | FE | Tạo trùng tên → thông báo lỗi dễ hiểu, form không mất dữ liệu đã nhập | ✅ |
| F1-13 | Xóa ngôn ngữ, có hộp xác nhận | FE | Phải xác nhận mới xóa; danh sách tự cập nhật sau khi xóa | ✅ |
| F1-14 | Khung trang `/languages/[id]` (cây level/collection bổ sung ở F2, F3) | FE | Mở từ card, hiện đúng tên ngôn ngữ; id không tồn tại → trang báo 404 | ✅ |

> **Lưu ý:** `vocabularyCount` trên card ngôn ngữ sẽ hiển thị 0 cho tới khi có bảng Vocabulary (task F4-07).

---

## F2 — Hệ thống level · Phase 3

**Mục tiêu:** mỗi ngôn ngữ có hệ thống level do người dùng tự tạo (JLPT, HSK, CEFR, Custom). **Không hard-code** level nào vào database.
**Phụ thuộc:** F1.

| ID | Task | Tầng | Xong khi | TT |
|---|---|---|---|:---:|
| F2-01 | Model `LevelSystem`, `Level` (có `order`) + migration; Cascade từ Language | DB | Migration chạy; Prisma Studio thấy quan hệ Language → LevelSystem → Level | ✅ |
| F2-02 | Tạo LevelSystem **kèm** danh sách level trong một request (`$transaction`); liệt kê theo ngôn ngữ, level sắp theo `order`; kiểm tra ngôn ngữ thuộc owner | BE | Một request tạo được JLPT kèm N5→N1; ngôn ngữ của owner khác → 404 | ✅ |
| F2-03 | Sửa/xóa LevelSystem; mỗi ngôn ngữ chỉ có tối đa một `isDefault` | BE | Đặt default cho hệ thống B thì hệ thống A tự bỏ default | ✅ |
| F2-04 | Thêm/sửa/xóa level, đổi thứ tự; tên level là duy nhất trong một hệ thống | BE | Trùng tên → 409; đổi thứ tự thì danh sách trả về đúng thứ tự mới | ✅ |
| F2-05 | Unit + e2e test cho level system và level | Test | Pass, gồm cả test cascade và cách ly `ownerId` | ✅ |
| F2-06 | UI tạo hệ thống level: nhập mỗi dòng một level; có nút **mẫu** JLPT/HSK/CEFR chỉ để điền sẵn form, người dùng vẫn sửa được | FE | Tạo JLPT N5→N1 trong dưới 30 giây | ✅ |
| F2-07 | UI sửa, xóa, sắp xếp lại level | FE | Thay đổi hiển thị ngay trong trang chi tiết ngôn ngữ | ✅ |

---

## F3 — Collection · Phase 3

**Mục tiêu:** chia từ vựng thành bài học hoặc chủ đề. Collection **thuộc Language**; `levelId` được phép rỗng cho chủ đề xuyên level như "Food" (ADR-003).
**Phụ thuộc:** F2.

| ID | Task | Tầng | Xong khi | TT |
|---|---|---|---|:---:|
| F3-01 | Model `Collection` (`levelId` nullable, `kind` LESSON/TOPIC) + migration; Level bị xóa → `SetNull` | DB | Migration chạy; tạo được collection có và không có level | ✅ |
| F3-02 | CRUD + `GET /collections?languageId&levelId&kind` có phân trang (`levelId=null` lọc ra các chủ đề) | BE | Thử được mọi endpoint trên Swagger | ✅ |
| F3-03 | Quy tắc: `levelId` phải thuộc **cùng ngôn ngữ** với collection | BE | Gán level của tiếng Trung cho collection tiếng Nhật → 400 | ✅ |
| F3-04 | Unit + e2e test: collection xuyên level, xóa level thì collection còn nguyên (`levelId` về null), quy tắc F3-03, `ownerId` | Test | Tất cả pass | ✅ |
| F3-05 | Cây trong trang chi tiết ngôn ngữ: LevelSystem → Level → Collection, cộng nhóm "Topics" | FE | Hiện đúng cấu trúc `Japanese > N5 > Lesson 3` và `Japanese > Topics > Food` | ✅ |
| F3-06 | UI tạo/sửa/xóa collection (chọn một level, hoặc "Xuyên level") | FE | Tạo được cả LESSON lẫn TOPIC từ giao diện | ✅ |
| F3-07 | Khung trang chi tiết collection (danh sách từ bổ sung ở F6-07) | FE | Mở được từ cây; hiện tên, level, loại | ✅ |

---

## F4 — Từ vựng (backend) · Phase 4

**Mục tiêu:** API từ vựng đầy đủ: quan hệ N-N với collection, tìm kiếm, lọc, sắp xếp, phân trang.
**Phụ thuộc:** F3.

| ID | Task | Tầng | Xong khi | TT |
|---|---|---|---|:---:|
| F4-01 | Model `Vocabulary` + bảng nối `VocabularyCollection` + migration + index (theo DATABASE.md) | DB | Migration chạy; Prisma Studio thấy bảng nối có `addedAt` | ✅ |
| F4-02 | DTO: `term` và `meaning` bắt buộc, các field khác tùy chọn, `collectionIds[]`, giới hạn độ dài, `extra` tối đa 4KB | BE | Thiếu `term` → 400; `extra` quá 4KB → 400 | ✅ |
| F4-03 | `POST /vocabularies`: tạo từ + các dòng bảng nối trong một `$transaction`; kiểm tra language/level/collection thuộc owner và cùng ngôn ngữ | BE | Tạo `食べる` thuộc 2 collection trong một request | ✅ |
| F4-04 | Cảnh báo mềm khi trùng từ (`warnings: POSSIBLE_DUPLICATE`), **không** trả 409 | BE | Thêm `行` lần hai → 201 kèm `warnings` chứa id từ cũ | ✅ |
| F4-05 | `GET/PATCH/DELETE /vocabularies/:id`; PATCH `collectionIds` thay toàn bộ danh sách trong transaction | BE | Đổi collection của một từ, không mất dữ liệu nếu có lỗi giữa chừng | ✅ |
| F4-06 | `GET /vocabularies`: phân trang + lọc (language/level/collection) + tìm trong term/meaning/reading (không phân biệt hoa thường) + `sort` có whitelist; không có N+1 query | BE | Tìm "taber" ra `食べる`; `sort=hack:asc` → 400; log query cho thấy số truy vấn cố định | ✅ |
| F4-07 | Bổ sung `vocabularyCount` cho `/languages` và `/collections` bằng `_count` | BE | Card ngôn ngữ ở F1 hiện đúng số từ | ✅ |
| F4-08 | Unit + e2e test: các ca N-N, cảnh báo trùng, tìm kiếm Unicode, `limit>100`, `ownerId` | Test | Tất cả pass | ✅ |
| F4-09 | Mở rộng seed: khoảng 30 từ mẫu cho 3 ngôn ngữ, có từ thuộc nhiều collection | DB | Seed idempotent; đủ dữ liệu để thử giao diện ở F5, F6 | ✅ |

---

## F5 — Thêm từ nhanh · Phase 5

**Mục tiêu:** **chức năng quan trọng nhất của app.** Nhập 20 từ liên tục mà không chạm chuột.
**Phụ thuộc:** F4.

| ID | Task | Tầng | Xong khi | TT |
|---|---|---|---|:---:|
| F5-01 | Cài môi trường test frontend (Vitest + Testing Library) | Test | `npm run test` ở `frontend/` chạy được một test mẫu | ✅ |
| F5-02 | Trang `/vocabulary/new`: dropdown phụ thuộc nhau Language → Level → Collection (chọn nhiều collection) | FE | Đổi ngôn ngữ thì danh sách level và collection tự nạp lại; không có request `/undefined` | ✅ |
| F5-03 | Các field: term, meaning, reading, romanization, câu ví dụ, bản dịch, ghi chú; nhãn gợi ý theo ngôn ngữ (ví dụ `ja` → "Kana", `zh` → "Pinyin") | FE | Chọn tiếng Nhật thì nhãn đổi đúng | ✅ |
| F5-04 | Lưu xong: **giữ** Language/Level/Collection, xóa các field còn lại, con trỏ quay về ô `term` | FE | Lưu xong gõ được từ tiếp theo ngay, không cần click | ✅ |
| F5-05 | Phím tắt `Ctrl+Enter` để lưu | FE | Lưu được mà tay không rời bàn phím | ✅ |
| F5-06 | Hiện cảnh báo trùng từ bằng toast có link tới từ cũ, **không chặn** việc nhập tiếp | FE | Thêm từ trùng → thấy cảnh báo, form vẫn sẵn sàng cho từ tiếp theo | ✅ |
| F5-07 | Nhớ Language/Level/Collection dùng lần cuối (localStorage) | FE | Đóng rồi mở lại trang → ngữ cảnh cũ vẫn được chọn sẵn | ✅ |
| F5-08 | Từ trang collection bấm "Thêm từ" → form mở với ngữ cảnh điền sẵn | FE | Bấm từ `N5 > Lesson 3` → form đã chọn sẵn Japanese / N5 / Lesson 3 | ✅ |
| F5-09 | Trang sửa từ `/vocabulary/[id]/edit`, dùng lại cùng form | FE | Sửa nghĩa và đổi collection của một từ có sẵn | ✅ |
| F5-10 | Component test: giữ ngữ cảnh sau khi lưu, focus về `term`, `Ctrl+Enter` | Test | Tất cả pass | ✅ |
| F5-11 | **Nghiệm thu:** tự nhập 20 từ thật liên tục chỉ dùng bàn phím | FE | Bạn tự làm được và thấy nhanh. Đây là kiểm tra G5, AI không tự đánh dấu task này | ⬜ |

---

## F6 — Danh sách, tìm kiếm, lọc · Phase 6

**Mục tiêu:** tìm lại từ đã nhập; **không bao giờ tải toàn bộ database về frontend**.
**Phụ thuộc:** F4 (F5 nên xong trước để có dữ liệu thật).

| ID | Task | Tầng | Xong khi | TT |
|---|---|---|---|:---:|
| F6-01 | Trang `/vocabulary`: bảng trên desktop, dạng thẻ trên mobile | FE | Hiển thị gọn ở cả 375px và 1280px | ✅ |
| F6-02 | Ô tìm kiếm có debounce khoảng 300ms | FE | Gõ nhanh không bắn một request cho mỗi ký tự | ✅ |
| F6-03 | Bộ lọc Language / Level / Collection (phụ thuộc nhau) | FE | Kết hợp nhiều bộ lọc ra đúng kết quả | ✅ |
| F6-04 | Sắp xếp + phân trang | FE | Chuyển trang và đổi thứ tự hoạt động đúng | ✅ |
| F6-05 | Lưu trạng thái lọc/tìm/trang trên URL | FE | F5 (tải lại trang) hoặc chia sẻ link giữ nguyên bộ lọc | ✅ |
| F6-06 | Hành động trên từng dòng: sửa (sang F5-09), xóa (có xác nhận) | FE | Xóa xong danh sách tự cập nhật | ✅ |
| F6-07 | Trang chi tiết collection liệt kê từ của nó (dùng lại danh sách với `collectionId`) | FE | Mở `Lesson 3` thấy đúng các từ của bài đó | ✅ |
| F6-08 | Kiểm chứng không tải toàn bộ dữ liệu | Test | Tab Network: mỗi trang đúng một request với `limit=20` | ✅ |

> Bộ lọc **Status** cần bảng LearningProgress, nên được làm ở F9-09.

---

## F7 — Flashcard · Phase 7

**Mục tiêu:** học bằng thẻ lật. Ở phase này kết quả **chưa được lưu**; việc lưu được nối vào ở F9-05.
**Phụ thuộc:** F4.

| ID | Task | Tầng | Xong khi | TT |
|---|---|---|---|:---:|
| F7-01 | `GET /learning/session?mode=flashcard` lấy bộ từ theo phạm vi (language/level/collection), thứ tự ngẫu nhiên, có `limit`; kèm test | BE | Trả đúng số từ, đúng phạm vi, lọc `ownerId`; test pass | ✅ |
| F7-02 | Trang `/study`: chọn phạm vi, chế độ học, số từ | FE | Bắt đầu được một phiên học trong tối đa 2 lần bấm | ✅ |
| F7-03 | Thẻ: mặt trước là `term`; "Hiện đáp án" (phím Space); mặt sau đủ reading/romanization/nghĩa/ví dụ; chữ CJK cỡ lớn | FE | Lật được bằng phím Space; chữ Hán đọc rõ trên điện thoại | ✅ |
| F7-04 | Nút Again / Hard / Good / Easy (phím 1–4); "Again" đưa thẻ về cuối hàng đợi của phiên | FE | Học hết phiên chỉ bằng bàn phím; thẻ "Again" xuất hiện lại | ✅ |
| F7-05 | Màn hình tổng kết phiên | FE | Hiện số thẻ và số lần chọn mỗi mức đánh giá | ✅ |
| F7-06 | Component test: lật thẻ, phím tắt, cơ chế đưa lại thẻ "Again" | Test | Tất cả pass | ✅ |

---

## F8 — Trắc nghiệm · Phase 8

**Mục tiêu:** hai kiểu câu hỏi: **chọn nghĩa** và **chọn từ**. Đáp án nhiễu do **backend** sinh ra để frontend không phải tải toàn bộ từ vựng.
**Phụ thuộc:** F7.

| ID | Task | Tầng | Xong khi | TT |
|---|---|---|---|:---:|
| F8-01 | `mode=multiple_choice`: mỗi câu gồm 1 đáp án đúng + 3 đáp án nhiễu cùng ngôn ngữ, không trùng nghĩa với đáp án đúng; xử lý trường hợp có ít hơn 4 từ | BE | Luôn đủ 4 lựa chọn khác nhau, hoặc báo lỗi rõ ràng khi không đủ từ | ✅ |
| F8-02 | Test logic sinh đáp án nhiễu, phủ **mọi nhánh** (ít từ, nghĩa trùng, cả hai kiểu câu hỏi) | Test | Tất cả pass | ✅ |
| F8-03 | Giao diện quiz: 4 lựa chọn (phím 1–4), báo đúng/sai ngay, hiện đáp án đúng khi chọn sai | FE | Làm hết phiên chỉ bằng bàn phím | ✅ |
| F8-04 | Tổng kết phiên quiz: số câu đúng/sai, danh sách từ trả lời sai | FE | Hiện đúng số liệu của phiên | ✅ |

---

## F9 — Learning Progress · Phase 9

**Mục tiêu:** ghi lại kết quả học. Lưu số lần ôn, số lần đúng, số lần sai, lần ôn cuối và trạng thái. **Chưa làm Spaced Repetition** (ADR-007).
**Phụ thuộc:** F7, F8.

| ID | Task | Tầng | Xong khi | TT |
|---|---|---|---|:---:|
| F9-01 | Chốt quy tắc chuyển trạng thái `NEW → LEARNING → REVIEW → MASTERED` và ghi thành ADR **trước khi code** | Docs | Có ADR trong DECISIONS.md, bạn đã duyệt | ✅ |
| F9-02 | Model `LearningProgress` (tạo sẵn các cột SRS nhưng để trống) + `ReviewLog` + enum + migration | DB | Migration chạy; Prisma Studio thấy hai bảng | ✅ |
| F9-03 | `POST /learning/review`: trong một transaction, ghi `ReviewLog` + upsert `LearningProgress` + cập nhật bộ đếm + trạng thái | BE | Ôn một từ → một dòng log mới, bộ đếm tăng đúng | ✅ |
| F9-04 | Test: bộ đếm, lần ôn đầu tạo progress mới, mọi nhánh chuyển trạng thái, `ownerId` | Test | Tất cả pass | ✅ |
| F9-05 | Nối Flashcard và Quiz với `/learning/review` (gửi ngầm, không bắt người dùng chờ) | FE | Học xong một phiên → Prisma Studio có đủ số dòng `ReviewLog` | ✅ |
| F9-06 | `GET /learning/due` (MVP: trạng thái NEW/LEARNING, từ lâu chưa ôn nhất lên trước) | BE | Trả đúng danh sách; có test | ✅ |
| F9-07 | Nút **Review Due Words** trên thanh điều hướng mở phiên flashcard với các từ cần ôn | FE | Một lần bấm là bắt đầu ôn | ✅ |
| F9-08 | Hiện tiến độ ở danh sách và trang chi tiết từ (nhãn trạng thái, số lần ôn/đúng/sai, lần ôn cuối) | FE | Số liệu khớp với database | ✅ |
| F9-09 | Bật bộ lọc **Status** trong danh sách từ vựng (F6) | FE+BE | Lọc `status=LEARNING` ra đúng từ | ✅ |

---

## F10 — Dashboard · Phase 10

**Mục tiêu:** trang chủ cho biết hôm nay đã học gì và cần ôn gì.
**Phụ thuộc:** F9.

| ID | Task | Tầng | Xong khi | TT |
|---|---|---|---|:---:|
| F10-01 | Chốt cách tính "hôm nay" theo múi giờ (`APP_TIMEZONE=Asia/Ho_Chi_Minh`) và ghi thành ADR | Docs | Có ADR; bạn đã duyệt | ✅ |
| F10-02 | `GET /learning/stats`: hôm nay (đã ôn/đúng/sai/tỷ lệ), theo từng ngôn ngữ, tổng theo trạng thái, số từ cần ôn, streak | BE | Số liệu khớp với truy vấn SQL kiểm tra tay | ✅ |
| F10-03 | Test: ranh giới ngày theo múi giờ (ôn lúc 6h59 và 7h00 sáng), tỷ lệ đúng khi chưa ôn từ nào, streak | Test | Tất cả pass | ✅ |
| F10-04 | Giao diện Dashboard ở `/`: "Today's Learning" theo ngôn ngữ, các số tổng, 3 nút hành động lớn | FE | Học một phiên rồi quay lại → số liệu cập nhật | ✅ |
| F10-05 | Trạng thái trống cho người dùng mới (chưa có ngôn ngữ nào → hướng dẫn bước đầu tiên) | FE | Database rỗng → trang chủ chỉ rõ việc cần làm tiếp theo | ✅ |

---

## F11 — Nghiệm thu MVP

**Mục tiêu:** xác nhận MVP đạt tiêu chí thành công trong [REQUIREMENTS.md §6](REQUIREMENTS.md).
**Phụ thuộc:** F0–F10.

| ID | Task | Tầng | Xong khi | TT |
|---|---|---|---|:---:|
| F11-01 | Chạy trọn luồng: tạo Language → Level → Collection → thêm 20 từ → tìm/lọc → Flashcard → Quiz → xem Progress → Dashboard. **Không chạm vào database** | — | Bạn tự làm hết luồng mà không gặp lỗi chặn | ⬜ |
| F11-02 | Kiểm tra trên điện thoại (375px): 3 hành động chính, flashcard, quiz | FE | Dùng thoải mái bằng một tay | ⬜ |
| F11-03 | `/phase-verify` trên **toàn bộ** codebase (G4 đối chiếu 100% lời gọi Prisma) | Test | Không còn phát hiện NGHIÊM TRỌNG hoặc CAO | ✅ |
| F11-04 | Đối chiếu tài liệu với code: API.md, DATABASE.md, README | Docs | Không còn chỗ lệch giữa tài liệu và code | ✅ |
| F11-05 | Dùng thật 1 tuần; ghi các vấn đề gặp phải vào TODO.md | — | Có ít nhất 7 ngày dữ liệu trong `ReviewLog` | ⬜ |
| F11-06 | Gắn tag `v0.1.0-mvp` | Infra | `git tag` có `v0.1.0-mvp` | ⬜ |

---

> **Bốn task còn ⬜ ở trên, cùng F5-11, là việc của chủ dự án** — AI không tự đánh dấu:
> - **F5-11, F11-01** — tự chạy trọn luồng và tự nhập 20 từ thật (đây chính là G5 của mọi phase).
> - **F11-02** — phần đo được đã kiểm ở 375×812 (2026-10-06): không trang nào tràn ngang; thanh
>   3 hành động 125×56px luôn ở đáy; nút chấm flashcard 80×64px; đáp án quiz 343×56px; chữ từ
>   60px; ô nhập 16px (iOS không tự phóng to). Còn "dùng thoải mái bằng một tay" phải thử trên
>   điện thoại thật.
> - **F11-05** — dùng thật một tuần.
> - **F11-06** — gắn tag `v0.1.0-mvp` sau khi các mục trên xong: `git tag v0.1.0-mvp`.

---

## F12 — Spaced Repetition · Phase 11

**Mục tiêu:** mỗi từ có lịch ôn riêng theo thời gian. "Ôn tập" chỉ đưa ra những từ **đến hạn hôm nay**, và khoảng cách giữa các lần ôn giãn dần khi từ được nhớ tốt (ADR-012: SM-2).
**Phụ thuộc:** F9, F10. **Ngoài phạm vi MVP** — làm theo yêu cầu của chủ dự án ngày 2026-10-07.

| ID | Task | Tầng | Xong khi | TT |
|---|---|---|---|:---:|
| F12-01 | So sánh Leitner / SM-2 / FSRS, chốt thuật toán và cách suy trạng thái thành ADR **trước khi code** | Docs | Có ADR-012 trong DECISIONS.md | ✅ |
| F12-02 | Hàm thuần `schedule()` (SM-2) + `statusFor()` trong `learning/srs.ts`; hàm cộng ngày theo múi giờ | BE | Unit test phủ mọi nhánh: quên, lần đúng 1/2/3+, sàn ease 1.3, trần 365 ngày, chuỗi 1 → 6 → 15 → 38 | ✅ |
| F12-03 | `POST /learning/review` ghi `easeFactor`, `intervalDays`, `repetitions`, `dueAt`; trạng thái suy từ lịch ôn | BE | Ôn GOOD ba lần → `intervalDays` 1, 6, 15 và `dueAt` là 00:00 giờ địa phương của ngày đến hạn | ✅ |
| F12-04 | `GET /learning/due` và `dueCount` theo `dueAt ≤ now` (từ chưa ôn và dòng cũ `dueAt` null vẫn đến hạn); quá hạn lâu nhất trước, từ mới sau cùng | BE | Từ vừa ôn GOOD biến khỏi danh sách; lùi `dueAt` về quá khứ thì nó hiện lại ở đầu | ✅ |
| F12-05 | E2E cho lịch ôn + cập nhật các test Phase 9/10 theo quy tắc mới | Test | Toàn bộ unit + e2e pass | ✅ |
| F12-06 | UI: mỗi nút chấm flashcard hiện khoảng cách ôn kế tiếp; danh sách và trang sửa từ hiện ngày ôn lại; Dashboard và màn hình "hết từ cần ôn" nói theo hạn ôn | FE | Lật thẻ thấy "1 ngày / 6 ngày…" dưới các nút; ôn hết thì báo "quay lại ngày mai" | ✅ |

---
## F13 — Authentication · Phase 12

**Mục tiêu:** mỗi người dùng một tài khoản; `ownerId` là danh tính thật của người đang đăng nhập thay vì một hằng số trong `.env`. Dữ liệu đang có được giữ nguyên và thuộc về tài khoản đầu tiên đăng ký (ADR-013).
**Phụ thuộc:** F0–F12. **Ngoài phạm vi MVP** — làm theo yêu cầu của chủ dự án ngày 2026-10-07.

| ID | Task | Tầng | Xong khi | TT |
|---|---|---|---|:---:|
| F13-01 | Chốt cách băm mật khẩu, cách giữ phiên và cách xử lý dữ liệu cũ thành ADR **trước khi code** | Docs | Có ADR-013 trong DECISIONS.md | ✅ |
| F13-02 | Model `User` + migration; băm/kiểm mật khẩu bằng scrypt (hàm thuần) | DB+BE | Unit test: cùng mật khẩu ra hai hash khác nhau, kiểm đúng/sai, hash hỏng không làm sập | ✅ |
| F13-03 | `POST /auth/register`, `/auth/login`, `/auth/logout`, `GET /auth/me`; JWT trong cookie httpOnly; `JWT_SECRET` bắt buộc | BE | Đăng ký → có cookie httpOnly; `/auth/me` trả user và **không** trả `passwordHash` | ✅ |
| F13-04 | `JwtAuthGuard` toàn cục thay `OwnerGuard`; `@Public()` cho `/health` và auth; giới hạn tần suất cho login/register | BE | Không cookie → mọi endpoint dữ liệu trả 401; `/health` vẫn 200; quá 10 lần/phút → 429 | ✅ |
| F13-05 | Khóa ngoại `ownerId → User` (cascade) cho 4 bảng; dòng giữ chỗ + cơ chế "tài khoản đầu tiên nhận dữ liệu cũ" | DB+BE | Trên database dev: đăng ký lần đầu xong vẫn thấy đủ từ vựng cũ; đăng ký lần hai thấy app trống | ✅ |
| F13-06 | E2E auth + chuyển toàn bộ e2e hiện có sang gọi API bằng phiên đăng nhập thật | Test | Toàn bộ unit + e2e pass; có test hai tài khoản không thấy dữ liệu của nhau **qua API thật** | ✅ |
| F13-07 | Frontend: trang `/login`, `/register`; `apiFetch` gửi cookie; chưa đăng nhập → chuyển về `/login` rồi quay lại trang cũ; thanh điều hướng có tên người dùng + Đăng xuất | FE | Mở `/vocabulary` khi chưa đăng nhập → tới `/login`; đăng nhập xong quay lại `/vocabulary` | ✅ |
| F13-08 | Rà soát bảo mật riêng cho phần auth (subagent `security`) và sửa phát hiện | Test | Không còn phát hiện NGHIÊM TRỌNG hoặc CAO | ✅ |
| F13-09 | Cập nhật tài liệu: API.md, DATABASE.md, README (đăng ký lần đầu, biến môi trường mới), TODO "trước khi lên mạng" | Docs | Làm theo README trên database đang dùng → đăng nhập được và còn nguyên dữ liệu | ✅ |

---
## F14 — AWS Deployment · Phase 13

**Mục tiêu:** app có URL công khai trên một máy Lightsail, khoảng 7–8 USD/tháng; hạ tầng dựng bằng Terraform, deploy bằng GitHub Actions (ADR-014). Kế hoạch và sơ đồ: [AWS_PLAN.md](AWS_PLAN.md) · quy trình nhánh và pipeline: [GIT_FLOW.md](GIT_FLOW.md).
**Phụ thuộc:** F13. **Ngoài phạm vi MVP.** Các task cần tài khoản AWS, GitHub hoặc secret của chủ dự án (F14-07 trở đi) do **con người** làm; Claude Code không tự đánh ✅.

| ID | Task | Tầng | Xong khi | TT |
|---|---|---|---|:---:|
| F14-01 | Chốt nơi chạy, công cụ IaC và cách deploy thành ADR **trước khi code** | Docs | Có ADR-014 trong DECISIONS.md | ✅ |
| F14-02 | `Dockerfile` multi-stage cho backend (có target `migrate`) và frontend (`output: 'standalone'`), `.dockerignore` | Infra | `docker build` cả ba image chạy được ở local | ✅ |
| F14-03 | `infra/server/`: Compose production + `Caddyfile` (`/api/*` → backend) + `.env.example`; chạy thử toàn bộ stack ở local | Infra | `http://localhost/api/health` trả 200 qua Caddy; đăng ký + đăng nhập qua `/api` được; cổng Postgres không publish | ✅ |
| F14-04 | Terraform `infra/terraform/`: Lightsail + static IP + firewall, S3 backup + IAM user chỉ ghi, AWS Budgets | Infra | `terraform fmt -check` và `terraform validate` sạch | ✅ |
| F14-05 | GitHub Actions: `ci.yml` (lint, test, build, terraform validate) và `deploy.yml` (build image → GHCR → SSH deploy, có rollback) | Infra | `actionlint` sạch; mọi lệnh CI gọi tới chạy pass ở local | ✅ |
| F14-06 | Tài liệu quy trình nhánh + pipeline (`GIT_FLOW.md`), hướng dẫn dựng hạ tầng (`infra/README.md`), script backup | Docs | Có đủ: bảng secret cần đặt, các bước dựng lần đầu, cách rollback, cách khôi phục backup | ✅ |
| F14-07 | Hardening backend trước khi có URL công khai: `helmet`, `trust proxy = 1`, tắt Swagger ở production, throttler toàn cục | BE | E2E pass; Swagger trả 404 khi `NODE_ENV=production`; rate-limit tính theo IP thật sau Caddy | ⬜ |
| F14-08 | Tài khoản AWS: MFA cho root, IAM user riêng; `terraform apply` | Infra | Nhận email xác nhận budget; `terraform output` có static IP; SSH vào được (con người) | ⬜ |
| F14-09 | Đặt secret/variable trên GitHub, bật branch protection cho `main`, lượt CI đầu tiên | Infra | PR đầu tiên có dấu xanh từ CI (con người) | ⬜ |
| F14-10 | Tạo `/opt/vocab/.env` trên server, trỏ DNS, bật `DEPLOY_ENABLED`, deploy lần đầu | Infra | `https://<domain>/api/health` trả 200, trình duyệt hiện ổ khóa (con người) | ⬜ |
| F14-11 | Chuyển dữ liệu dev lên production bằng `pg_dump`/`pg_restore` (tài khoản phải tạo ở local **trước**, ADR-013), rồi `REGISTRATION_ENABLED=false` | DB | Đăng nhập trên production thấy đủ từ vựng cũ; đăng ký mới bị từ chối (con người) | ⬜ |
| F14-12 | Bật cron backup, **thử khôi phục** một bản vào Postgres ở local | Infra | Số dòng `Vocabulary` và `LearningProgress` khớp production (con người) | ⬜ |
| F14-13 | UptimeRobot cho `/api/health`; subagent `security` rà cấu hình production | Test | Không còn phát hiện NGHIÊM TRỌNG hoặc CAO | ⬜ |

---
## Sau MVP

Chưa có nhóm nào sau F14.

---

## Nhật ký tiến độ

Mỗi task xong thì thêm một dòng. Mới nhất ở trên cùng.

| Ngày | Task | Ghi chú |
|---|---|---|
| 2026-10-08 | F14-06 | `docs/GIT_FLOW.md` (nhánh, hai workflow, rollback, bảng secret/variable, vì sao không Argo CD), `infra/README.md` (chạy thử local, dựng lần đầu, chuyển dữ liệu, backup + khôi phục), `infra/server/backup.sh`. Các lệnh chuyển dữ liệu và khôi phục trong README **chưa chạy thử** — cần server và bucket thật (F14-11, F14-12) |
| 2026-10-08 | F14-05 | `.github/workflows/ci.yml` + `deploy.yml`. `actionlint` sạch (đã sửa SC2087: biến truyền qua stdin bằng `printf %q`). Chạy local đúng các lệnh CI gọi: backend lint/format/build, unit 227, e2e 260; frontend lint/format, test 117, build. Chưa có lượt chạy thật trên GitHub (F14-09) |
| 2026-10-08 | F14-04 | `infra/terraform/`: 12 tài nguyên (Lightsail + key pair + static IP + firewall, S3 + lifecycle + chặn public, IAM user chỉ `PutObject`, Budgets). `terraform fmt -check` và `validate` sạch qua image `hashicorp/terraform:1.9`. Chưa `plan`/`apply` — cần tài khoản AWS (F14-08) |
| 2026-10-08 | F14-03 | Stack production chạy ở local qua Caddy: `/api/health` 200, đăng ký 201 với cookie `HttpOnly; Secure`, `/api/auth/me` 200, chưa đăng nhập → 401, `Origin` lạ → 403, cổng 4000 không tới được từ ngoài, trình duyệt mở `/vocabulary` được chuyển về `/login` và gọi `/api/auth/me` |
| 2026-10-08 | F14-02 | `backend/Dockerfile` (target `runtime`, `migrate`), `frontend/Dockerfile`, `output: 'standalone'`. Build được cả ba image: frontend 292 MB, backend 726 MB, migrate 1,42 GB. Bắt được lỗi: thiếu `tsconfig.json` lúc `prisma generate` làm client sinh import đuôi `.ts`, app chết khi khởi động |
| 2026-10-08 | F14-01 | ADR-014: một máy Lightsail + Docker Compose (~7–8 USD/tháng), Terraform với state ở máy dev, GitHub Actions thay Argo CD (Argo cần Kubernetes), giữ mô hình nhánh `main` + `feature/phase-<n>`. Chủ dự án chọn cả ba qua câu hỏi trực tiếp. Thêm nhóm F14 (13 task) |
| 2026-10-07 | F13-09 | API.md (mục Auth, chống CSRF), DATABASE.md (bảng User, dòng giữ chỗ), README (đăng ký lần đầu, JWT_SECRET, nâng cấp database cũ, quên mật khẩu), `.env.example`, TODO "trước khi lên mạng", ADR-013 có đính chính. Chưa tự kiểm được dòng "đăng nhập được và còn nguyên dữ liệu" trên database dev — việc đăng ký đầu tiên là của chủ dự án; luồng đó được phủ bằng e2e trên database test |
| 2026-10-07 | F13-08 | Subagent `security` rà riêng phần auth: 32 route (4 công khai có chủ đích), 0 nghiêm trọng, 2 cao, 4 trung bình. Đã sửa: chốt Origin + Content-Type chống CSRF (form chéo site từng chiếm được dòng giữ chỗ), HOST ngoài loopback bắt buộc cấu hình production, `safeNext` lọt ký tự tab, tham số scrypt ghi trong hash. +16 e2e, +20 unit, +14 frontend. Phần còn lại ghi TODO cho Phase 13 |
| 2026-10-07 | F13-07 | Trang `/login` và `/register` (RHF + Zod, một form dùng chung); `apiFetch` gửi cookie (`credentials: include`); `AuthGate` chuyển về `/login?next=…` và `safeNext` chỉ nhận đường dẫn nội bộ (chống open redirect); thanh điều hướng có nút Đăng xuất. Trên trình duyệt: mở `/vocabulary?status=LEARNING` khi chưa đăng nhập → `/login?next=%2Fvocabulary%3Fstatus%3DLEARNING`; cookie không đọc được từ JavaScript. +33 test frontend (103/103). Chưa đăng ký thật trên database dev — tài khoản đầu tiên phải là của chủ dự án |
| 2026-10-07 | F13-06 | Toàn bộ e2e chuyển sang client mang cookie phiên thật (`authed(app)`); `global-setup` dựng lại schema test từ đầu mỗi lượt. +52 e2e auth (hai tài khoản thật cách ly qua mọi API, cascade khi xóa user) + 28 unit. Test bắt được bug: `REGISTRATION_ENABLED=false` bị ép kiểu ngầm thành `true`. Tổng: unit 207, e2e 244 |
| 2026-10-07 | F13-05 | Migration `add_owner_foreign_keys` (4 khóa ngoại, cascade). Trên database dev: `npm run auth:prepare-legacy` tạo dòng giữ chỗ cho 3 ngôn ngữ + 30 từ rồi mới bật khóa ngoại. E2E: tài khoản đầu nhận dữ liệu cũ, tài khoản thứ hai trống, hai người đăng ký cùng lúc chỉ một người nhận |
| 2026-10-07 | F13-04 | `JwtAuthGuard` toàn cục thay `OwnerGuard`, `@Public()` cho `/health` + auth; e2e: 15 endpoint không cookie → 401, JWT rác / `alg none` / ký khóa khác / hết hạn / gửi qua header → 401; quá giới hạn → 429. `@CurrentUser()` và mọi service không đổi một dòng |
| 2026-10-07 | F13-03 | `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/me`; JWT HS256 hạn 7 ngày trong cookie `HttpOnly; SameSite=Lax`; body không bao giờ chứa token hay `passwordHash`. `JWT_SECRET` bắt buộc ở production, local thiếu thì sinh khóa tạm ngẫu nhiên (không có secret nào trong repo) |
| 2026-10-07 | F13-02 | Model `User` (migration `add_user`); `auth/password.ts` băm scrypt với salt riêng từng mật khẩu, so sánh `timingSafeEqual`; 12 unit test: hai hash khác nhau cho cùng mật khẩu, sai một ký tự → false, 8 dạng chuỗi hỏng → false không ném lỗi |
| 2026-10-07 | F13-01 | ADR-013: scrypt (node:crypto, không thêm native addon), JWT trong cookie httpOnly + sameSite=lax, guard toàn cục mặc định khóa, tài khoản đầu tiên đăng ký nhận dữ liệu cũ (không có mật khẩu mặc định nào). Quyết định bởi Claude Code theo ủy quyền ngày 2026-10-07 |
| 2026-10-07 | F12-06 | Nút chấm flashcard hiện khoảng cách ôn ("ngay / 1 ngày / 15 ngày / ~3 tháng"), thẻ vừa Quên quay lại với lịch học lại; danh sách và trang sửa từ hiện "Ôn lại ngày mai / sau N ngày"; Dashboard "N từ đến hạn ôn"; hết từ → "Hôm nay bạn đã ôn hết". Thử trên trình duyệt với dữ liệu thật; frontend 70/70 |
| 2026-10-07 | F12-05 | Viết lại `learning-progress.e2e-spec.ts` theo ADR-012 (40 test) và `progress-rules.spec.ts` (28 test); toàn bộ backend: unit 179, e2e 192 pass |
| 2026-10-07 | F12-04 | `whereDue()` dùng chung cho `GET /learning/due` và `dueCount`: chưa ôn, `dueAt` null (dòng cũ) hoặc `dueAt ≤ now`. E2E: từ vừa GOOD biến khỏi danh sách, kéo hạn về quá khứ thì hiện lại ở đầu (kể cả MASTERED); quá hạn lâu nhất trước, từ mới sau cùng |
| 2026-10-07 | F12-03 | `POST /learning/review` ghi `easeFactor` / `intervalDays` / `repetitions` / `dueAt`; e2e: GOOD ba lần → 1, 6, 15 ngày và `dueAt` đúng 00:00 giờ Việt Nam của ngày đến hạn; quên → 0 ngày, LEARNING; 38 ngày → MASTERED. Không cần migration schema |
| 2026-10-07 | F12-02 | `learning/srs.ts`: `schedule()` (SM-2), `statusFor()`, `previewIntervals()` + `dueDateAfter()` trong time-zone.ts — đều là hàm thuần; 26 + 5 unit test: quên, lần đúng 1/2/3+, sàn ease 1.3, trần 365 ngày, chuỗi 1 → 6 → 15 → 38 → 95, DST |
| 2026-10-07 | F12-01 | ADR-012: chọn SM-2 (dùng đúng 4 cột SRS có sẵn, không migration; FSRS cần dữ liệu để khớp tham số). Trạng thái suy từ lịch ôn: repetitions 0 → LEARNING, interval ≥ 21 ngày → MASTERED. Quyết định bởi Claude Code theo ủy quyền ngày 2026-10-07 |
| 2026-10-06 | F11-04 | Đối chiếu tài liệu với code: README (trạng thái, cách dùng, seed, xử lý sự cố), ARCHITECTURE (cây thư mục, tên module), API.md (mọi endpoint ✅, quy ước `null`, stats, due, reorder), DATABASE.md (`correctStreak`, `isCorrect`), Roadmap trong CLAUDE.md, cột Gate |
| 2026-10-06 | F11-03 | G1–G4 trên toàn bộ codebase. G3 (`reviewer`): 0 nghiêm trọng, 1 cao (ô tìm kiếm mất focus) + 8 mục nhỏ — đã sửa hết, có test hồi quy. G4 (`security`): 0/53 lời gọi Prisma không an toàn về `ownerId`; nâng `next` 16.3.6. Sau sửa: unit 148, e2e 179, frontend 52, build production cả hai phía OK |
| 2026-10-06 | F10-05 | Người dùng mới: database rỗng → "Thêm ngôn ngữ" là bước duy nhất có nút; có ngôn ngữ chưa có từ → "Thêm từ"; 6 component test (frontend 41/41) |
| 2026-10-06 | F10-04 | Dashboard ở `/`: 3 thẻ hành động lớn, Hôm nay theo ngôn ngữ, chuỗi ngày, kho từ theo trạng thái; sau phiên ôn 4 lượt trên trình duyệt trang chủ hiện 4 / 3 / 1 / 75% |
| 2026-10-06 | F10-03 | 27 unit test cho `time-zone.ts` (ranh giới 6:59/7:00 sáng, nửa đêm, cuối tháng/năm, DST 23h/25h, streak) + 11 e2e (ranh giới từng mili-giây, accuracy null, ownerId, số truy vấn cố định) |
| 2026-10-06 | F10-02 | `GET /learning/stats`: today / byLanguage / totals / dueCount / streak bằng COUNT và GROUP BY trong database; e2e đối chiếu với dữ liệu dựng tay (8 lượt, 6 đúng, 0.75) và `dueCount` khớp `/learning/due` |
| 2026-10-06 | F10-01 | ADR-011: "hôm nay" theo `APP_TIMEZONE` (mặc định Asia/Ho_Chi_Minh, validate lúc khởi động). Quyết định bởi Claude Code theo ủy quyền ngày 2026-10-06 — chủ dự án nên đọc lại khi nghiệm thu |
| 2026-10-06 | F9-09 | `GET /vocabularies?status=` + dropdown "Lọc theo trạng thái" (lưu trên URL); `?status=LEARNING` ra đúng 2 từ vừa ôn |
| 2026-10-06 | F9-08 | Danh sách hiện nhãn trạng thái + "N lần · đúng · sai"; trang sửa từ có khối Tiến độ (trạng thái, số lần, đúng/sai, lần ôn cuối) — khớp database |
| 2026-10-06 | F9-07 | Nút **Ôn tập** trên thanh điều hướng → `/study/session?source=due` mở thẳng phiên flashcard các từ cần ôn (một lần bấm) |
| 2026-10-06 | F9-06 | `GET /learning/due`: NEW (kể cả chưa có dòng tiến độ) + LEARNING, chưa ôn lần nào trước rồi tới ôn lâu nhất; trả kèm `total`; có e2e |
| 2026-10-06 | F9-05 | Flashcard và Quiz gọi `/learning/review` qua `useReviewRecorder` (không await, lỗi báo toast một lần); phiên 3 thẻ trên trình duyệt → 4 request review, database khớp |
| 2026-10-06 | F9-04 | `progress-rules.ts` là hàm thuần, 28 unit test phủ bộ đếm, chuỗi, mọi nhánh thăng/tụt; + 27 e2e. Test bắt được bug: `isCorrect: "yes"` bị ValidationPipe ép ngầm thành true → sửa bằng `rawValue` (áp dụng cả `isDefault`) |
| 2026-10-06 | F9-03 | `POST /learning/review`: một transaction ghi `ReviewLog` + upsert `LearningProgress`; e2e: ôn 4 lần → 4 dòng log, một dòng tiến độ, bộ đếm 4/2/2 |
| 2026-10-06 | F9-02 | Model `LearningProgress` (4 cột SRS để trống + cột mới `correctStreak`) + `ReviewLog` + 3 enum; migration `add_learning_progress_review_log` |
| 2026-10-06 | F9-01 | ADR-010: chuyển trạng thái theo chuỗi đúng liên tiếp (2 → REVIEW, 5 → MASTERED, sai tụt một bậc). Quyết định bởi Claude Code theo ủy quyền "tự ra quyết định" ngày 2026-10-06 — chủ dự án nên đọc lại khi nghiệm thu |
| 2026-10-06 | F8-04 | Tổng kết quiz: đúng/sai, phần trăm, danh sách "Cần xem lại" gồm từ + nghĩa của các câu sai; 9 test frontend (35/35) |
| 2026-10-06 | F8-03 | `QuizSession`: phím 1–4 chọn, báo đúng/sai ngay, chọn sai thì tô xanh đáp án đúng, Space/Enter sang câu; trả lời rồi không sửa được — làm hết 10 câu trên trình duyệt chỉ bằng phím |
| 2026-10-06 | F8-02 | `multiple-choice.ts` là hàm thuần nhận nguồn ngẫu nhiên; 20 unit test phủ: ít từ (0/1/3/4 từ), trùng nghĩa, đồng tự, nhiễu trùng nhau, cả hai kiểu câu hỏi; + 8 e2e |
| 2026-10-06 | F8-01 | `mode=multiple_choice` + `questionType` (chọn nghĩa / chọn từ): 1 đúng + 3 nhiễu cùng ngôn ngữ, bể nhiễu 60 từ/ngôn ngữ lấy bằng một truy vấn `row_number() OVER (PARTITION BY …)`; ngôn ngữ dưới 4 từ → 400 thông điệp rõ |
| 2026-10-06 | F7-06 | 11 test: 5 cho logic hàm thuần (`flashcard-session.ts`) + 6 component test (lật, phím tắt, Again quay lại, Ctrl bị bỏ qua); frontend 26/26 |
| 2026-10-06 | F7-05 | Màn tổng kết: số thẻ + số lần mỗi mức đánh giá, nút Học phiên mới / Chọn phạm vi khác |
| 2026-10-06 | F7-04 | Quên/Khó/Được/Dễ bằng phím 1–4 (chỉ sau khi lật); Quên đưa thẻ về cuối hàng đợi — học hết 20 thẻ trên trình duyệt chỉ bằng phím |
| 2026-10-06 | F7-03 | Thẻ: mặt trước chỉ có từ (60px mobile / 72px desktop), Space hoặc Enter lật ra cách đọc · nghĩa · ví dụ · ghi chú |
| 2026-10-06 | F7-02 | Trang `/study`: chế độ, phạm vi phụ thuộc, số từ; nút Bắt đầu được focus sẵn → Học rồi Bắt đầu = 2 lần bấm |
| 2026-10-06 | F7-01 | `GET /learning/session?mode=flashcard`: chọn ngẫu nhiên bằng `ORDER BY random() LIMIT n` trong Postgres (SQL tham số hóa); e2e 11 test: đúng số từ, đúng phạm vi, ngẫu nhiên, ownerId |
| 2026-10-06 | F6-08 | Resource Timing trên trình duyệt: mỗi lần mở trang đúng 1 request `/vocabularies?page=1&limit=20…` |
| 2026-10-06 | F6-07 | Trang collection nhúng `VocabularyBrowser` với `collectionId` bị khóa: Lesson 3 hiện đúng các từ của bài, chỉ còn ô tìm + sắp xếp |
| 2026-10-06 | F6-06 | Mỗi dòng có Sửa (sang `/vocabulary/[id]/edit`) và Xóa có hộp xác nhận; xóa `猫` → danh sách và số đếm tự cập nhật |
| 2026-10-06 | F6-05 | Trạng thái nằm trên URL (`useVocabularyQuery`): mở thẳng `?languageId=…&sort=term:asc` → dropdown và danh sách khôi phục đúng |
| 2026-10-06 | F6-04 | Sắp xếp 5 kiểu (whitelist) + Trước/Sau; 31 từ → trang 2/2 có 11 dòng; đổi bộ lọc tự về trang 1 |
| 2026-10-06 | F6-03 | Lọc Language → Level → Collection phụ thuộc nhau: Japanese 13 từ → +N5 12 từ → +Food 5 từ; bỏ ngôn ngữ thì level/bài học bị khóa và xóa |
| 2026-10-06 | F6-02 | `SearchInput` debounce 300ms: gõ nhanh t→ta→tab→tabe→taber chỉ bắn đúng 1 request `search=taber` |
| 2026-10-06 | F6-01 | Trang `/vocabulary`: ở 375px hiện 20 thẻ (chữ từ 24px), bảng ẩn, không tràn ngang; ở 1280px hiện bảng 4 cột |
| 2026-10-06 | F5-10 | 15 component test pass: giữ ngữ cảnh, focus, nhập 3 từ chỉ bằng Tab+Enter, Ctrl+Enter, dropdown phụ thuộc, cảnh báo trùng, chế độ sửa |
| 2026-10-06 | F5-09 | `/vocabulary/[id]/edit` dùng lại `VocabularyForm`: khóa ngôn ngữ, sửa nghĩa và đổi collection (đã lưu nghĩa mới qua trình duyệt; sửa thêm lỗi stale-closure khi bấm chip liên tiếp) |
| 2026-10-06 | F5-08 | Trang collection có nút "Thêm từ vào đây" → form mở với Japanese / N5 / Lesson 3 điền sẵn, con trỏ ở ô Từ |
| 2026-10-06 | F5-07 | Ngữ cảnh lưu vào localStorage ngay khi đổi; mở lại `/vocabulary/new` thấy Japanese / N5 / Lesson 3 chọn sẵn; id đã bị xóa thì tự dọn |
| 2026-10-06 | F5-06 | Thêm `行く` lần hai → toast "Từ này đã có trong Lesson 3" kèm link `/vocabulary/<id>/edit`; từ vẫn được lưu, form trống sẵn sàng |
| 2026-10-06 | F5-05 | `Ctrl+Enter` (Cmd+Enter) lưu từ mọi ô kể cả textarea; Enter thường trong textarea không lưu |
| 2026-10-06 | F5-04 | Lưu xong giữ ngữ cảnh, xóa ô, focus về `Từ`. Test bắt được bug thật: `form.setFocus` sau `reset()` không tìm thấy field → đổi sang ref riêng |
| 2026-10-06 | F5-03 | Đủ 7 field; nhãn theo mã ngôn ngữ: ja → Kana/Romaji, zh → Pinyin, en → IPA và ẩn ô romanization |
| 2026-10-06 | F5-02 | `/vocabulary/new`: Language → Level → Collection (chip chọn nhiều); dùng `enabled` nên không có request `/undefined` (kiểm tra bằng Resource Timing trên trình duyệt) |
| 2026-10-06 | F5-01 | Vitest + Testing Library + jsdom ở `frontend/` (`npm run test`); bỏ `@vitejs/plugin-react` vì xung đột peer dependency với Babel của Next — Vitest tự biên dịch JSX |
| 2026-10-06 | F4-09 | Seed 30 từ cho 3 ngôn ngữ kèm level system và collection, có từ thuộc 3 collection và cặp đồng tự `行`/`bank`; chạy 2 lần vẫn 30 từ |
| 2026-10-06 | F4-08 | Unit 17 test + e2e 42 test cho vocabulary (N-N, cảnh báo trùng, Unicode, `limit>100`, ownerId); unit 72/72, e2e 109/109 |
| 2026-10-06 | F4-07 | `vocabularyCount` của `/languages` và `/collections` lấy bằng `_count`; e2e: Japanese 2, Chinese 0, Food 2, Lesson 3 1 |
| 2026-10-06 | F4-06 | `GET /vocabularies`: tìm `taber`/`TABER`/`たべ` ra `食べる`; `sort=hack:asc` → 400; test đếm sự kiện query: `limit=1` và `limit=100` cùng số truy vấn |
| 2026-10-06 | F4-05 | GET/PATCH/DELETE `/vocabularies/:id`; PATCH `collectionIds` thay toàn bộ trong `$transaction`; id sai → lỗi và danh sách cũ còn nguyên |
| 2026-10-06 | F4-04 | Thêm `行` lần hai → 201 kèm `warnings[POSSIBLE_DUPLICATE]` chứa id từ cũ; không cảnh báo chéo ngôn ngữ / chéo owner |
| 2026-10-06 | F4-03 | `POST /vocabularies` tạo từ + dòng bảng nối bằng nested create (một transaction); e2e tạo `食べる` thuộc 2 collection; level/collection khác ngôn ngữ → 400, của owner khác → 404 |
| 2026-10-06 | F4-02 | DTO: `term`/`meaning` bắt buộc, giới hạn độ dài, `collectionIds[]` unique, `extra` ≤ 4096 byte (validator `MaxJsonBytes`); e2e: thiếu term → 400, extra 4KB+ → 400 |
| 2026-10-06 | F4-01 | Model `Vocabulary` + bảng nối `VocabularyCollection` (có `addedAt`) + 3 index theo DATABASE.md; migration `add_vocabulary` |
| 2026-10-06 | F3-07 | `/collections/[id]` mở từ cây, hiện tên, loại, level, số từ, link quay về ngôn ngữ; id lạ → 404 |
| 2026-10-06 | F3-06 | Dialog collection: từ nhánh N5 mở sẵn Bài học/N5, từ nhóm Chủ đề mở sẵn Chủ đề/Xuyên level; tạo được cả hai loại |
| 2026-10-06 | F3-05 | Cây trong `/languages/[id]`: `JLPT > N5 > Lesson 3` và nhóm `Chủ đề > Food` hiển thị đúng trên trình duyệt |
| 2026-10-06 | F3-04 | Unit 13 test + e2e 18 test: xuyên level, xóa level thì collection còn (`levelId` → null), luật F3-03, ownerId; unit 55/55, e2e 67/67 |
| 2026-10-06 | F3-03 | Gán level HSK 1 cho collection tiếng Nhật → 400 `Level không thuộc cùng ngôn ngữ với collection`; `languageId` không đổi được sau khi tạo |
| 2026-10-06 | F3-02 | CRUD + `GET /collections?languageId&levelId&kind` phân trang; `levelId=null` lọc ra chủ đề; kiểm chứng bằng e2e |
| 2026-10-06 | F3-01 | Model `Collection` (`levelId` nullable, `kind`), Level xóa → `SetNull`; e2e tạo được collection có và không có level |
| 2026-10-06 | F2-07 | Trong trang ngôn ngữ: đổi tên (lỗi trùng hiện ngay trong dialog), xóa, mũi tên lên/xuống đổi thứ tự — thay đổi hiện ngay |
| 2026-10-06 | F2-06 | Dialog tạo hệ thống: nút mẫu JLPT/HSK/CEFR điền sẵn tên + textarea mỗi dòng một level; thử trên trình duyệt: 2 lần bấm + Lưu ra JLPT N5→N1 |
| 2026-10-06 | F2-05 | Unit 13 test + e2e 19 test cho level system/level, gồm cascade và cách ly ownerId; tất cả pass |
| 2026-10-06 | F2-04 | Thêm/sửa/xóa level + `POST /level-systems/:id/levels/reorder` (endpoint phát sinh, đã ghi vào API.md); trùng tên → 409; reorder thiếu/thừa id → 400 |
| 2026-10-06 | F2-03 | PATCH/DELETE `/level-systems/:id`; e2e: đặt default cho B thì A tự bỏ default, không ảnh hưởng ngôn ngữ khác |
| 2026-10-06 | F2-02 | `POST /languages/:id/level-systems` tạo JLPT kèm N5→N1 trong một `$transaction`; ngôn ngữ của owner khác → 404; hệ thống đầu tiên tự thành default |
| 2026-10-06 | F2-01 | Model `LevelSystem`, `Level` trong migration `add_level_systems_levels_collections`; e2e xác nhận xóa Language cascade xóa cả hai |
| 2026-10-06 | F1-14 | `/languages/[id]` hiện tên ngôn ngữ; `/languages/khong-co` → màn hình 404 có nút về danh sách |
| 2026-10-06 | F1-13 | Xóa qua hộp xác nhận (nêu số từ sẽ mất); tạo Korean rồi xóa → danh sách tự về 3 mục |
| 2026-10-06 | F1-12 | Form RHF + Zod trong dialog; tạo trùng "Japanese" → ô tên báo `Ngôn ngữ "Japanese" đã tồn tại`, giá trị đã gõ còn nguyên |
| 2026-10-06 | F1-11 | Trang `/languages` hiện 3 ngôn ngữ đã seed (tên + số từ + mã); có đủ nhánh loading / error / empty / dữ liệu trong `LanguageList` |
| 2026-10-06 | F1-10 | `AppShell`: header + thanh 3 hành động cố định ở đáy trên mobile (trạng thái "Sắp có"); đo ở 375px: 3 nút cao 56px, luôn trong khung nhìn, không tràn ngang |
| 2026-10-06 | F1-09 | `npx prisma db seed` chạy 2 lần liên tiếp → vẫn 3 ngôn ngữ (upsert theo `ownerId_name`); thêm `tsx` để chạy seed |
| 2026-10-06 | F1-08 | E2E 26 test Languages: CRUD, 400, 404, 409, cách ly ownerId, Unicode (日本語/中文/한국어/Tiếng Việt); `npm run test:e2e` 30/30 pass |
| 2026-10-06 | F1-07 | Unit test mẫu: 12 test cho 5 method (happy path + nhánh lỗi), `npm run test` 29/29 pass |
| 2026-10-06 | F1-06 | 5 endpoint + DTO + Swagger; status 200/201/204 kiểm chứng bằng e2e thay cho bấm tay trên Swagger |
| 2026-10-06 | F1-05 | `LanguagesService` 5 method, mọi lời gọi Prisma có `ownerId` (xóa bằng `deleteMany({id, ownerId})`) |
| 2026-10-06 | F1-04 | Migration `20261006120605_add_language` áp dụng trên DB dev; `@@unique([ownerId, name])` |
| 2026-10-06 | F1-03 | `AllExceptionsFilter` gắn trong `configureApp`: P2002→409, P2025→404, P2003→409, lỗi lạ → 500 chung; e2e xác nhận body không chứa prisma/constraint/stack |
| 2026-10-06 | F1-02 | `PaginationDto` + `paginate()`; e2e: `limit=101`, `limit=0`, `page=0`, `page=-1`, `page=abc` → 400 |
| 2026-10-06 | F1-01 | `OwnerGuard` (APP_GUARD) gán `ownerId` từ ConfigService, `@CurrentUser()` đọc từ request; grep `process.env` trong `src/` = 0 kết quả |
| 2026-09-21 | F0-13 | Clone mới vào thư mục tạm, làm đúng 3 bước README: compose healthy, `npm install` tự sinh Prisma Client, `/health` ok·connected, Swagger 200, trang chủ "Backend: ok · DB: connected". Chạy ở cổng 4001/3001 bằng biến môi trường vì server dev của bạn đang giữ 4000/3000 |
| 2026-09-21 | F0-08 | Sửa `TEST_DATABASE_URL` trong `backend/.env` 5433 → 5435 (trước đó e2e trả 503); `npm run test` 2/2 pass, `npm run test:e2e` 1/1 pass |
| 2026-09-21 | F0-11 | Trang `/` hiện "Backend: ok · DB: connected" trên trình duyệt thật (2 trạng thái lỗi đã kiểm chứng trước đó) |
| 2026-09-21 | F0-07 | `GET /health` → 200 `{status:"ok",database:"connected"}`; Swagger `/api` → 200 (nhánh 503 đã kiểm chứng trước đó) |
| 2026-09-21 | F0-06 | `npx prisma validate` pass; backend khởi động log `[PrismaService] Kết nối database: OK` |
| 2026-09-21 | F0-02 | Gỡ Docker bằng cách tắt `EnableDockerAI` (không phải xóa socket); đổi cổng DB test 5433 → **5435** vì container Postgres của dự án khác đang giữ 5433; cả hai container healthy |
| 2026-09-19 | F0-12 | backend oxlint + frontend ESLint (type-aware); no-explicit-any & no-floating-promises = error, đã chứng minh bắt lỗi bằng file thử; Prettier + format:check cả hai |
| 2026-09-19 | F0-10 | shadcn/ui (base-nova) + TanStack Query + apiFetch/ApiError; gọi /health qua CORS thành công; sửa lỗi font --font-sans tự tham chiếu |
| 2026-09-19 | F0-09 | Next.js 16.3.5 (App Router, TS strict, Tailwind 4) chạy ở 3000; tắt agentRules; bỏ .gitignore của Next (nuốt .env.*.example) |
| 2026-09-19 | F0-05 | ValidationPipe + CORS dùng chung qua configureApp() (cho cả e2e); Swagger /api 200 |
| 2026-09-19 | F0-04 | ConfigModule + validate env lúc khởi động (thiếu biến → dừng với thông báo rõ); .env.example; không secret trong src/ |
| 2026-09-19 | F0-03 | NestJS 12 (ESM, Vitest, oxlint); cổng 4000; bỏ @nestjs/mau; ADR-009 |
| 2026-09-19 | F0-01 | git init; commit đầu 7516d96; .env bị ignore, .env.example không; thêm .gitattributes (LF) |
| 2026-09-19 | — | Tạo PLAN.md: 99 task, 12 nhóm chức năng |
