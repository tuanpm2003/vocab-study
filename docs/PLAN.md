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
| F0 | Nền tảng dự án | 1 | §4 | 13 | 4 | 31% | — |
| F1 | Quản lý ngôn ngữ | 2 | §3.1 | 14 | 0 | 0% | — |
| F2 | Hệ thống level | 3 | §3.2 | 7 | 0 | 0% | — |
| F3 | Collection | 3 | §3.3 | 7 | 0 | 0% | — |
| F4 | Từ vựng (backend) | 4 | §3.4, §3.9 | 9 | 0 | 0% | — |
| F5 | Thêm từ nhanh | 5 | §3.5 | 11 | 0 | 0% | — |
| F6 | Danh sách, tìm kiếm, lọc | 6 | §3.9 | 8 | 0 | 0% | — |
| F7 | Flashcard | 7 | §3.6 | 6 | 0 | 0% | — |
| F8 | Trắc nghiệm | 8 | §3.6 | 4 | 0 | 0% | — |
| F9 | Learning Progress | 9 | §3.7 | 9 | 0 | 0% | — |
| F10 | Dashboard | 10 | §3.8 | 5 | 0 | 0% | — |
| F11 | Nghiệm thu MVP | — | §6 | 6 | 0 | 0% | — |
| | **Tổng** | | | **99** | **4** | **4%** | |

Cột Gate ghi kết quả khi đóng phase, ví dụ `G1✅ G2✅ G3✅ G4✅ G5✅`. Hai chức năng cùng Phase 3 (F2, F3) dùng chung một dòng Gate.

---

## F0 — Nền tảng dự án · Phase 1

**Mục tiêu:** một "walking skeleton" (bộ khung chạy được): trình duyệt → Next.js → NestJS → PostgreSQL chạy thông suốt, dù chưa có tính năng nào.
**Phụ thuộc:** không.

| ID | Task | Tầng | Xong khi | TT |
|---|---|---|---|:---:|
| F0-01 | `git init`, `.gitignore` (node_modules, .env, dist, .next), commit tài liệu Phase 0 | Infra | `git log` có commit đầu tiên; `git check-ignore backend/.env` xác nhận `.env` bị bỏ qua | ✅ |
| F0-02 | `docker-compose.yml`: Postgres dev (5434 — 5432 đã bị PostgreSQL 18 cài sẵn chiếm) + test (5433), bind `127.0.0.1`, có volume | Infra | `docker compose ps` cho thấy cả hai container healthy | ⬜ |
| F0-03 | Khởi tạo NestJS trong `backend/`, TypeScript strict | BE | `npm run start:dev` chạy, `http://localhost:4000` phản hồi | ✅ |
| F0-04 | `ConfigModule` + `.env` / `.env.example` (`DATABASE_URL`, `PORT`, `LOCAL_OWNER_ID`, `CORS_ORIGIN`) | BE | App đọc cấu hình từ env; grep không thấy secret nào trong `src/` | ✅ |
| F0-05 | `ValidationPipe` toàn cục (`whitelist`, `forbidNonWhitelisted`, `transform`), CORS cho `localhost:3000`, Swagger | BE | Swagger UI mở được tại `/api` | ✅ |
| F0-06 | Cài Prisma, `PrismaModule` + `PrismaService` (có shutdown hook) | DB | `npx prisma validate` pass; app kết nối được DB khi khởi động | ⬜ |
| F0-07 | `GET /health` kiểm tra kết nối DB bằng `SELECT 1` | BE | Trả 200 `{status:"ok", database:"connected"}`; tắt Docker → trả 503 | ⬜ |
| F0-08 | Cấu hình Vitest cho unit + e2e (e2e dùng DB test 5433, có chốt chặn không cho chạy nhầm vào DB dev) — ADR-009 | Test | `npm run test` và `npm run test:e2e` đều chạy, test `/health` pass | ⬜ |
| F0-09 | Khởi tạo Next.js trong `frontend/` (App Router, TS strict, Tailwind) | FE | `npm run dev` chạy tại `http://localhost:3000` | ⬜ |
| F0-10 | shadcn/ui + TanStack Query provider + `lib/api-client.ts` (`ApiError`) + `.env.local.example` | FE | Build pass; `apiFetch` gọi được backend | ⬜ |
| F0-11 | Walking skeleton: trang chủ gọi `/health` và hiển thị trạng thái | FE | Trình duyệt hiện "Backend: ok · DB: connected"; tắt backend → hiện thông báo lỗi dễ hiểu | ⬜ |
| F0-12 | Linter + Prettier: backend oxlint, frontend ESLint (ADR-009); `no-floating-promises` và `no-explicit-any` = error | Infra | `npm run lint` pass ở cả `backend/` và `frontend/` | ⬜ |
| F0-13 | README: hướng dẫn cài đặt từ đầu | Docs | Làm theo README trên một thư mục clone mới → app chạy được | ⬜ |

---

## F1 — Quản lý ngôn ngữ · Phase 2

**Mục tiêu:** CRUD ngôn ngữ đầy đủ từ database tới giao diện. **Đây là module mẫu**: mọi module sau sẽ sao chép pattern của nó, nên đáng đầu tư làm tử tế.
**Phụ thuộc:** F0.

| ID | Task | Tầng | Xong khi | TT |
|---|---|---|---|:---:|
| F1-01 | Decorator `@CurrentUser()` trả `ownerId` từ `LOCAL_OWNER_ID` | BE | Controller nhận được `ownerId`; không có chỗ nào đọc `process.env` trực tiếp trong service | ⬜ |
| F1-02 | `PaginationDto` (`page` ≥1, `limit` 1–100) + kiểu response `{items,total,page,limit,totalPages}` | BE | `limit=101` → 400; `page=0` → 400 | ⬜ |
| F1-03 | `PrismaExceptionFilter`: P2002→409, P2025→404, P2003→409; lỗi có shape thống nhất | BE | Lỗi trả ra không chứa tên bảng, câu SQL, stack trace | ⬜ |
| F1-04 | Model `Language` + migration `add_language` (`@@unique([ownerId, name])`) | DB | Migration chạy; Prisma Studio thấy bảng `Language` | ⬜ |
| F1-05 | `LanguagesService`: findAll (phân trang), findOne, create, update, remove — tất cả lọc `ownerId` | BE | Mọi lời gọi Prisma có `ownerId` trong `where` | ⬜ |
| F1-06 | Controller + DTO + Swagger: `GET/POST /languages`, `GET/PATCH/DELETE /languages/:id` | BE | Thử được cả 5 endpoint trên Swagger với đúng status code (200/201/204) | ⬜ |
| F1-07 | Unit test service (mock `PrismaService`) — **bộ test mẫu** | Test | Mỗi method có happy path + ít nhất một nhánh lỗi; tất cả pass | ⬜ |
| F1-08 | E2E test: CRUD, 400 (thiếu field, field lạ), 404, 409 trùng tên, cách ly `ownerId`, Unicode | Test | Tất cả pass trên DB test | ⬜ |
| F1-09 | Seed idempotent: Japanese, Chinese, English | DB | Chạy `npx prisma db seed` hai lần không tạo bản ghi trùng | ⬜ |
| F1-10 | App shell: layout, thanh điều hướng có 3 hành động chính (tạm để trạng thái "sắp có" cho tới khi tính năng tồn tại), responsive | FE | Ở màn hình 375px, điều hướng dùng được và 3 nút chính luôn nhìn thấy | ⬜ |
| F1-11 | Trang `/languages`: danh sách card (tên + số từ); đủ 4 trạng thái loading / error / empty / có dữ liệu | FE | Thấy được cả 4 trạng thái (tắt backend để xem trạng thái lỗi) | ⬜ |
| F1-12 | Form tạo/sửa ngôn ngữ (React Hook Form + Zod), hiển thị lỗi 409 từ backend | FE | Tạo trùng tên → thông báo lỗi dễ hiểu, form không mất dữ liệu đã nhập | ⬜ |
| F1-13 | Xóa ngôn ngữ, có hộp xác nhận | FE | Phải xác nhận mới xóa; danh sách tự cập nhật sau khi xóa | ⬜ |
| F1-14 | Khung trang `/languages/[id]` (cây level/collection bổ sung ở F2, F3) | FE | Mở từ card, hiện đúng tên ngôn ngữ; id không tồn tại → trang báo 404 | ⬜ |

> **Lưu ý:** `vocabularyCount` trên card ngôn ngữ sẽ hiển thị 0 cho tới khi có bảng Vocabulary (task F4-07).

---

## F2 — Hệ thống level · Phase 3

**Mục tiêu:** mỗi ngôn ngữ có hệ thống level do người dùng tự tạo (JLPT, HSK, CEFR, Custom). **Không hard-code** level nào vào database.
**Phụ thuộc:** F1.

| ID | Task | Tầng | Xong khi | TT |
|---|---|---|---|:---:|
| F2-01 | Model `LevelSystem`, `Level` (có `order`) + migration; Cascade từ Language | DB | Migration chạy; Prisma Studio thấy quan hệ Language → LevelSystem → Level | ⬜ |
| F2-02 | Tạo LevelSystem **kèm** danh sách level trong một request (`$transaction`); liệt kê theo ngôn ngữ, level sắp theo `order`; kiểm tra ngôn ngữ thuộc owner | BE | Một request tạo được JLPT kèm N5→N1; ngôn ngữ của owner khác → 404 | ⬜ |
| F2-03 | Sửa/xóa LevelSystem; mỗi ngôn ngữ chỉ có tối đa một `isDefault` | BE | Đặt default cho hệ thống B thì hệ thống A tự bỏ default | ⬜ |
| F2-04 | Thêm/sửa/xóa level, đổi thứ tự; tên level là duy nhất trong một hệ thống | BE | Trùng tên → 409; đổi thứ tự thì danh sách trả về đúng thứ tự mới | ⬜ |
| F2-05 | Unit + e2e test cho level system và level | Test | Pass, gồm cả test cascade và cách ly `ownerId` | ⬜ |
| F2-06 | UI tạo hệ thống level: nhập mỗi dòng một level; có nút **mẫu** JLPT/HSK/CEFR chỉ để điền sẵn form, người dùng vẫn sửa được | FE | Tạo JLPT N5→N1 trong dưới 30 giây | ⬜ |
| F2-07 | UI sửa, xóa, sắp xếp lại level | FE | Thay đổi hiển thị ngay trong trang chi tiết ngôn ngữ | ⬜ |

---

## F3 — Collection · Phase 3

**Mục tiêu:** chia từ vựng thành bài học hoặc chủ đề. Collection **thuộc Language**; `levelId` được phép rỗng cho chủ đề xuyên level như "Food" (ADR-003).
**Phụ thuộc:** F2.

| ID | Task | Tầng | Xong khi | TT |
|---|---|---|---|:---:|
| F3-01 | Model `Collection` (`levelId` nullable, `kind` LESSON/TOPIC) + migration; Level bị xóa → `SetNull` | DB | Migration chạy; tạo được collection có và không có level | ⬜ |
| F3-02 | CRUD + `GET /collections?languageId&levelId&kind` có phân trang (`levelId=null` lọc ra các chủ đề) | BE | Thử được mọi endpoint trên Swagger | ⬜ |
| F3-03 | Quy tắc: `levelId` phải thuộc **cùng ngôn ngữ** với collection | BE | Gán level của tiếng Trung cho collection tiếng Nhật → 400 | ⬜ |
| F3-04 | Unit + e2e test: collection xuyên level, xóa level thì collection còn nguyên (`levelId` về null), quy tắc F3-03, `ownerId` | Test | Tất cả pass | ⬜ |
| F3-05 | Cây trong trang chi tiết ngôn ngữ: LevelSystem → Level → Collection, cộng nhóm "Topics" | FE | Hiện đúng cấu trúc `Japanese > N5 > Lesson 3` và `Japanese > Topics > Food` | ⬜ |
| F3-06 | UI tạo/sửa/xóa collection (chọn một level, hoặc "Xuyên level") | FE | Tạo được cả LESSON lẫn TOPIC từ giao diện | ⬜ |
| F3-07 | Khung trang chi tiết collection (danh sách từ bổ sung ở F6-07) | FE | Mở được từ cây; hiện tên, level, loại | ⬜ |

---

## F4 — Từ vựng (backend) · Phase 4

**Mục tiêu:** API từ vựng đầy đủ: quan hệ N-N với collection, tìm kiếm, lọc, sắp xếp, phân trang.
**Phụ thuộc:** F3.

| ID | Task | Tầng | Xong khi | TT |
|---|---|---|---|:---:|
| F4-01 | Model `Vocabulary` + bảng nối `VocabularyCollection` + migration + index (theo DATABASE.md) | DB | Migration chạy; Prisma Studio thấy bảng nối có `addedAt` | ⬜ |
| F4-02 | DTO: `term` và `meaning` bắt buộc, các field khác tùy chọn, `collectionIds[]`, giới hạn độ dài, `extra` tối đa 4KB | BE | Thiếu `term` → 400; `extra` quá 4KB → 400 | ⬜ |
| F4-03 | `POST /vocabularies`: tạo từ + các dòng bảng nối trong một `$transaction`; kiểm tra language/level/collection thuộc owner và cùng ngôn ngữ | BE | Tạo `食べる` thuộc 2 collection trong một request | ⬜ |
| F4-04 | Cảnh báo mềm khi trùng từ (`warnings: POSSIBLE_DUPLICATE`), **không** trả 409 | BE | Thêm `行` lần hai → 201 kèm `warnings` chứa id từ cũ | ⬜ |
| F4-05 | `GET/PATCH/DELETE /vocabularies/:id`; PATCH `collectionIds` thay toàn bộ danh sách trong transaction | BE | Đổi collection của một từ, không mất dữ liệu nếu có lỗi giữa chừng | ⬜ |
| F4-06 | `GET /vocabularies`: phân trang + lọc (language/level/collection) + tìm trong term/meaning/reading (không phân biệt hoa thường) + `sort` có whitelist; không có N+1 query | BE | Tìm "taber" ra `食べる`; `sort=hack:asc` → 400; log query cho thấy số truy vấn cố định | ⬜ |
| F4-07 | Bổ sung `vocabularyCount` cho `/languages` và `/collections` bằng `_count` | BE | Card ngôn ngữ ở F1 hiện đúng số từ | ⬜ |
| F4-08 | Unit + e2e test: các ca N-N, cảnh báo trùng, tìm kiếm Unicode, `limit>100`, `ownerId` | Test | Tất cả pass | ⬜ |
| F4-09 | Mở rộng seed: khoảng 30 từ mẫu cho 3 ngôn ngữ, có từ thuộc nhiều collection | DB | Seed idempotent; đủ dữ liệu để thử giao diện ở F5, F6 | ⬜ |

---

## F5 — Thêm từ nhanh · Phase 5

**Mục tiêu:** **chức năng quan trọng nhất của app.** Nhập 20 từ liên tục mà không chạm chuột.
**Phụ thuộc:** F4.

| ID | Task | Tầng | Xong khi | TT |
|---|---|---|---|:---:|
| F5-01 | Cài môi trường test frontend (Vitest + Testing Library) | Test | `npm run test` ở `frontend/` chạy được một test mẫu | ⬜ |
| F5-02 | Trang `/vocabulary/new`: dropdown phụ thuộc nhau Language → Level → Collection (chọn nhiều collection) | FE | Đổi ngôn ngữ thì danh sách level và collection tự nạp lại; không có request `/undefined` | ⬜ |
| F5-03 | Các field: term, meaning, reading, romanization, câu ví dụ, bản dịch, ghi chú; nhãn gợi ý theo ngôn ngữ (ví dụ `ja` → "Kana", `zh` → "Pinyin") | FE | Chọn tiếng Nhật thì nhãn đổi đúng | ⬜ |
| F5-04 | Lưu xong: **giữ** Language/Level/Collection, xóa các field còn lại, con trỏ quay về ô `term` | FE | Lưu xong gõ được từ tiếp theo ngay, không cần click | ⬜ |
| F5-05 | Phím tắt `Ctrl+Enter` để lưu | FE | Lưu được mà tay không rời bàn phím | ⬜ |
| F5-06 | Hiện cảnh báo trùng từ bằng toast có link tới từ cũ, **không chặn** việc nhập tiếp | FE | Thêm từ trùng → thấy cảnh báo, form vẫn sẵn sàng cho từ tiếp theo | ⬜ |
| F5-07 | Nhớ Language/Level/Collection dùng lần cuối (localStorage) | FE | Đóng rồi mở lại trang → ngữ cảnh cũ vẫn được chọn sẵn | ⬜ |
| F5-08 | Từ trang collection bấm "Thêm từ" → form mở với ngữ cảnh điền sẵn | FE | Bấm từ `N5 > Lesson 3` → form đã chọn sẵn Japanese / N5 / Lesson 3 | ⬜ |
| F5-09 | Trang sửa từ `/vocabulary/[id]/edit`, dùng lại cùng form | FE | Sửa nghĩa và đổi collection của một từ có sẵn | ⬜ |
| F5-10 | Component test: giữ ngữ cảnh sau khi lưu, focus về `term`, `Ctrl+Enter` | Test | Tất cả pass | ⬜ |
| F5-11 | **Nghiệm thu:** tự nhập 20 từ thật liên tục chỉ dùng bàn phím | FE | Bạn tự làm được và thấy nhanh. Đây là kiểm tra G5, AI không tự đánh dấu task này | ⬜ |

---

## F6 — Danh sách, tìm kiếm, lọc · Phase 6

**Mục tiêu:** tìm lại từ đã nhập; **không bao giờ tải toàn bộ database về frontend**.
**Phụ thuộc:** F4 (F5 nên xong trước để có dữ liệu thật).

| ID | Task | Tầng | Xong khi | TT |
|---|---|---|---|:---:|
| F6-01 | Trang `/vocabulary`: bảng trên desktop, dạng thẻ trên mobile | FE | Hiển thị gọn ở cả 375px và 1280px | ⬜ |
| F6-02 | Ô tìm kiếm có debounce khoảng 300ms | FE | Gõ nhanh không bắn một request cho mỗi ký tự | ⬜ |
| F6-03 | Bộ lọc Language / Level / Collection (phụ thuộc nhau) | FE | Kết hợp nhiều bộ lọc ra đúng kết quả | ⬜ |
| F6-04 | Sắp xếp + phân trang | FE | Chuyển trang và đổi thứ tự hoạt động đúng | ⬜ |
| F6-05 | Lưu trạng thái lọc/tìm/trang trên URL | FE | F5 (tải lại trang) hoặc chia sẻ link giữ nguyên bộ lọc | ⬜ |
| F6-06 | Hành động trên từng dòng: sửa (sang F5-09), xóa (có xác nhận) | FE | Xóa xong danh sách tự cập nhật | ⬜ |
| F6-07 | Trang chi tiết collection liệt kê từ của nó (dùng lại danh sách với `collectionId`) | FE | Mở `Lesson 3` thấy đúng các từ của bài đó | ⬜ |
| F6-08 | Kiểm chứng không tải toàn bộ dữ liệu | Test | Tab Network: mỗi trang đúng một request với `limit=20` | ⬜ |

> Bộ lọc **Status** cần bảng LearningProgress, nên được làm ở F9-09.

---

## F7 — Flashcard · Phase 7

**Mục tiêu:** học bằng thẻ lật. Ở phase này kết quả **chưa được lưu**; việc lưu được nối vào ở F9-05.
**Phụ thuộc:** F4.

| ID | Task | Tầng | Xong khi | TT |
|---|---|---|---|:---:|
| F7-01 | `GET /learning/session?mode=flashcard` lấy bộ từ theo phạm vi (language/level/collection), thứ tự ngẫu nhiên, có `limit`; kèm test | BE | Trả đúng số từ, đúng phạm vi, lọc `ownerId`; test pass | ⬜ |
| F7-02 | Trang `/study`: chọn phạm vi, chế độ học, số từ | FE | Bắt đầu được một phiên học trong tối đa 2 lần bấm | ⬜ |
| F7-03 | Thẻ: mặt trước là `term`; "Hiện đáp án" (phím Space); mặt sau đủ reading/romanization/nghĩa/ví dụ; chữ CJK cỡ lớn | FE | Lật được bằng phím Space; chữ Hán đọc rõ trên điện thoại | ⬜ |
| F7-04 | Nút Again / Hard / Good / Easy (phím 1–4); "Again" đưa thẻ về cuối hàng đợi của phiên | FE | Học hết phiên chỉ bằng bàn phím; thẻ "Again" xuất hiện lại | ⬜ |
| F7-05 | Màn hình tổng kết phiên | FE | Hiện số thẻ và số lần chọn mỗi mức đánh giá | ⬜ |
| F7-06 | Component test: lật thẻ, phím tắt, cơ chế đưa lại thẻ "Again" | Test | Tất cả pass | ⬜ |

---

## F8 — Trắc nghiệm · Phase 8

**Mục tiêu:** hai kiểu câu hỏi: **chọn nghĩa** và **chọn từ**. Đáp án nhiễu do **backend** sinh ra để frontend không phải tải toàn bộ từ vựng.
**Phụ thuộc:** F7.

| ID | Task | Tầng | Xong khi | TT |
|---|---|---|---|:---:|
| F8-01 | `mode=multiple_choice`: mỗi câu gồm 1 đáp án đúng + 3 đáp án nhiễu cùng ngôn ngữ, không trùng nghĩa với đáp án đúng; xử lý trường hợp có ít hơn 4 từ | BE | Luôn đủ 4 lựa chọn khác nhau, hoặc báo lỗi rõ ràng khi không đủ từ | ⬜ |
| F8-02 | Test logic sinh đáp án nhiễu, phủ **mọi nhánh** (ít từ, nghĩa trùng, cả hai kiểu câu hỏi) | Test | Tất cả pass | ⬜ |
| F8-03 | Giao diện quiz: 4 lựa chọn (phím 1–4), báo đúng/sai ngay, hiện đáp án đúng khi chọn sai | FE | Làm hết phiên chỉ bằng bàn phím | ⬜ |
| F8-04 | Tổng kết phiên quiz: số câu đúng/sai, danh sách từ trả lời sai | FE | Hiện đúng số liệu của phiên | ⬜ |

---

## F9 — Learning Progress · Phase 9

**Mục tiêu:** ghi lại kết quả học. Lưu số lần ôn, số lần đúng, số lần sai, lần ôn cuối và trạng thái. **Chưa làm Spaced Repetition** (ADR-007).
**Phụ thuộc:** F7, F8.

| ID | Task | Tầng | Xong khi | TT |
|---|---|---|---|:---:|
| F9-01 | Chốt quy tắc chuyển trạng thái `NEW → LEARNING → REVIEW → MASTERED` và ghi thành ADR **trước khi code** | Docs | Có ADR trong DECISIONS.md, bạn đã duyệt | ⬜ |
| F9-02 | Model `LearningProgress` (tạo sẵn các cột SRS nhưng để trống) + `ReviewLog` + enum + migration | DB | Migration chạy; Prisma Studio thấy hai bảng | ⬜ |
| F9-03 | `POST /learning/review`: trong một transaction, ghi `ReviewLog` + upsert `LearningProgress` + cập nhật bộ đếm + trạng thái | BE | Ôn một từ → một dòng log mới, bộ đếm tăng đúng | ⬜ |
| F9-04 | Test: bộ đếm, lần ôn đầu tạo progress mới, mọi nhánh chuyển trạng thái, `ownerId` | Test | Tất cả pass | ⬜ |
| F9-05 | Nối Flashcard và Quiz với `/learning/review` (gửi ngầm, không bắt người dùng chờ) | FE | Học xong một phiên → Prisma Studio có đủ số dòng `ReviewLog` | ⬜ |
| F9-06 | `GET /learning/due` (MVP: trạng thái NEW/LEARNING, từ lâu chưa ôn nhất lên trước) | BE | Trả đúng danh sách; có test | ⬜ |
| F9-07 | Nút **Review Due Words** trên thanh điều hướng mở phiên flashcard với các từ cần ôn | FE | Một lần bấm là bắt đầu ôn | ⬜ |
| F9-08 | Hiện tiến độ ở danh sách và trang chi tiết từ (nhãn trạng thái, số lần ôn/đúng/sai, lần ôn cuối) | FE | Số liệu khớp với database | ⬜ |
| F9-09 | Bật bộ lọc **Status** trong danh sách từ vựng (F6) | FE+BE | Lọc `status=LEARNING` ra đúng từ | ⬜ |

---

## F10 — Dashboard · Phase 10

**Mục tiêu:** trang chủ cho biết hôm nay đã học gì và cần ôn gì.
**Phụ thuộc:** F9.

| ID | Task | Tầng | Xong khi | TT |
|---|---|---|---|:---:|
| F10-01 | Chốt cách tính "hôm nay" theo múi giờ (`APP_TIMEZONE=Asia/Ho_Chi_Minh`) và ghi thành ADR | Docs | Có ADR; bạn đã duyệt | ⬜ |
| F10-02 | `GET /learning/stats`: hôm nay (đã ôn/đúng/sai/tỷ lệ), theo từng ngôn ngữ, tổng theo trạng thái, số từ cần ôn, streak | BE | Số liệu khớp với truy vấn SQL kiểm tra tay | ⬜ |
| F10-03 | Test: ranh giới ngày theo múi giờ (ôn lúc 6h59 và 7h00 sáng), tỷ lệ đúng khi chưa ôn từ nào, streak | Test | Tất cả pass | ⬜ |
| F10-04 | Giao diện Dashboard ở `/`: "Today's Learning" theo ngôn ngữ, các số tổng, 3 nút hành động lớn | FE | Học một phiên rồi quay lại → số liệu cập nhật | ⬜ |
| F10-05 | Trạng thái trống cho người dùng mới (chưa có ngôn ngữ nào → hướng dẫn bước đầu tiên) | FE | Database rỗng → trang chủ chỉ rõ việc cần làm tiếp theo | ⬜ |

---

## F11 — Nghiệm thu MVP

**Mục tiêu:** xác nhận MVP đạt tiêu chí thành công trong [REQUIREMENTS.md §6](REQUIREMENTS.md).
**Phụ thuộc:** F0–F10.

| ID | Task | Tầng | Xong khi | TT |
|---|---|---|---|:---:|
| F11-01 | Chạy trọn luồng: tạo Language → Level → Collection → thêm 20 từ → tìm/lọc → Flashcard → Quiz → xem Progress → Dashboard. **Không chạm vào database** | — | Bạn tự làm hết luồng mà không gặp lỗi chặn | ⬜ |
| F11-02 | Kiểm tra trên điện thoại (375px): 3 hành động chính, flashcard, quiz | FE | Dùng thoải mái bằng một tay | ⬜ |
| F11-03 | `/phase-verify` trên **toàn bộ** codebase (G4 đối chiếu 100% lời gọi Prisma) | Test | Không còn phát hiện NGHIÊM TRỌNG hoặc CAO | ⬜ |
| F11-04 | Đối chiếu tài liệu với code: API.md, DATABASE.md, README | Docs | Không còn chỗ lệch giữa tài liệu và code | ⬜ |
| F11-05 | Dùng thật 1 tuần; ghi các vấn đề gặp phải vào TODO.md | — | Có ít nhất 7 ngày dữ liệu trong `ReviewLog` | ⬜ |
| F11-06 | Gắn tag `v0.1.0-mvp` | Infra | `git tag` có `v0.1.0-mvp` | ⬜ |

---

## Sau MVP

Phase 11 (Spaced Repetition), Phase 12 (Authentication), Phase 13 (AWS) **không nằm trong file này**. Khi MVP xong, lập kế hoạch cho chúng thành các nhóm F12+ theo cùng định dạng, dựa trên dữ liệu thật từ F11-05.

---

## Nhật ký tiến độ

Mỗi task xong thì thêm một dòng. Mới nhất ở trên cùng.

| Ngày | Task | Ghi chú |
|---|---|---|
| 2026-09-19 | F0-05 | ValidationPipe + CORS dùng chung qua configureApp() (cho cả e2e); Swagger /api 200 |
| 2026-09-19 | F0-04 | ConfigModule + validate env lúc khởi động (thiếu biến → dừng với thông báo rõ); .env.example; không secret trong src/ |
| 2026-09-19 | F0-03 | NestJS 12 (ESM, Vitest, oxlint); cổng 4000; bỏ @nestjs/mau; ADR-009 |
| 2026-09-19 | F0-01 | git init; commit đầu 7516d96; .env bị ignore, .env.example không; thêm .gitattributes (LF) |
| 2026-09-19 | — | Tạo PLAN.md: 99 task, 12 nhóm chức năng |
