# DECISIONS — Architecture Decision Records

> Nhật ký các quyết định kiến trúc **khó đảo ngược** và **không hiển nhiên**.
> Tạo ADR mới bằng `/adr <tiêu đề>`.
>
> **Không xóa ADR cũ.** Khi một quyết định bị thay thế, đánh dấu
> `Superseded by ADR-XXX` — lịch sử quyết định chính là giá trị của tài liệu này.

| # | Quyết định | Ngày | Trạng thái |
|---|---|---|---|
| 001 | Stack: Next.js + NestJS + PostgreSQL + Prisma | 2026-09-18 | Accepted |
| 002 | Next.js không truy cập database | 2026-09-18 | Accepted |
| 003 | Collection thuộc Language, `levelId` nullable | 2026-09-18 | Accepted |
| 004 | Vocabulary ↔ Collection là Many-to-Many tường minh | 2026-09-18 | Accepted |
| 005 | Một bảng Vocabulary cho mọi ngôn ngữ + cột JSONB `extra` | 2026-09-18 | Accepted |
| 006 | Hoãn bảng User, nhưng mang `ownerId` từ đầu | 2026-09-18 | Accepted |
| 007 | Cột SRS tạo sẵn ở Phase 9, thuật toán để Phase 11 | 2026-09-18 | Accepted |
| 008 | Quy trình AI-assisted: session chính viết code, subagent kiểm chứng | 2026-09-18 | Accepted |
| 009 | Theo mặc định NestJS 12 (ESM, Vitest, oxlint) + Prisma 7 ghim phiên bản | 2026-09-19 | Accepted |

---

## ADR-001 — Stack: Next.js + NestJS + PostgreSQL + Prisma

- **Ngày:** 2026-09-18 · **Trạng thái:** Accepted · **Phase:** 0

### Bối cảnh
Dự án cá nhân, chủ dự án ở mức cơ bản/intermediate về web dev và AWS, muốn vừa có app
dùng được vừa học được kiến trúc. Cần chọn stack một lần và không đổi giữa chừng.

### Các phương án đã cân nhắc

**Frontend:** Next.js / React+Vite / Vue
React+Vite đơn giản nhất và deploy static dễ nhất, nhưng phải tự chọn router và tự bịa cấu
trúc thư mục. Vue tốt nhưng ecosystem nhỏ hơn và không dùng chung tư duy với NestJS.

**Backend:** NestJS / Express / FastAPI / Spring Boot
Express không cho kiến trúc nào — với người đang học architecture, "tự do hoàn toàn" dẫn
tới thư mục `routes/` lộn xộn. FastAPI xuất sắc nhưng là ngôn ngữ thứ hai và mất khả năng
chia sẻ type với frontend. Spring Boot verbose, tốn RAM nhất trên ECS (~512MB vs ~256MB),
vòng lặp phát triển chậm.

**Database:** PostgreSQL / MySQL / MongoDB
MongoDB hấp dẫn vì "schema linh hoạt", nhưng đổi một vấn đề nhỏ (field linh hoạt) lấy một
vấn đề lớn (N-N và toàn vẹn dữ liệu phải tự quản lý). MySQL dùng được nhưng JSON yếu hơn
JSONB, không có `pg_trgm`.

**ORM:** Prisma / TypeORM / Drizzle / Kysely
TypeORM hay lỗi migration. Drizzle và Kysely nhẹ và mạnh nhưng đòi hỏi biết SQL nhiều hơn.

### Quyết định
Next.js + TypeScript / NestJS + TypeScript / PostgreSQL 16 / Prisma.

### Lý do
- **NestJS** dạy các khái niệm chuyển được sang mọi framework nghiêm túc khác: Module,
  Dependency Injection, Controller/Service, DTO+Pipe, Guard/Interceptor/Filter. Ba khái niệm
  cuối là thứ sẽ làm Phase 12 (auth) thành việc nhỏ thay vì một cuộc đại phẫu.
- **PostgreSQL** giải quyết luôn vấn đề "field linh hoạt" bằng JSONB → không phải đánh đổi
  gì với MongoDB. Thêm `pg_trgm` cho tìm kiếm mờ (gõ "taber" ra "taberu") — rất hợp app từ vựng.
- **Prisma** cho một file schema làm nguồn sự thật duy nhất, và `prisma studio` để *nhìn thấy*
  dữ liệu và quan hệ — giá trị giáo dục lớn với người đang học DB design.
- **Cùng một ngôn ngữ** (TypeScript) ở cả hai đầu, do một người viết.

### Hệ quả
**Tích cực:** một ngôn ngữ, type an toàn xuyên suốt, ecosystem lớn, deploy linh hoạt.
**Cái giá phải trả:**
- Prisma sinh query engine binary → Docker image lớn hơn ~50MB.
- Truy vấn phân tích phức tạp (Dashboard Phase 10) có thể phải hạ xuống `$queryRaw`.
- Next.js + backend riêng có cái bẫy "hai tầng backend" → xử lý bằng ADR-002.
**Khóa chúng ta vào:** hệ sinh thái Node/TypeScript. Đổi backend sang ngôn ngữ khác =
viết lại toàn bộ.

### Khi nào nên xem lại
Khi cần xử lý bất đồng bộ nặng (hàng nghìn job TTS đồng thời), hoặc khi Prisma trở thành
nút thắt hiệu năng đo được — không phải cảm giác.

---

## ADR-002 — Next.js không truy cập database

- **Ngày:** 2026-09-18 · **Trạng thái:** Accepted · **Phase:** 0

### Bối cảnh
Next.js App Router có thể tự truy cập DB qua Server Components, Server Actions, Route
Handlers. Nhưng dự án đã có một backend NestJS riêng.

### Các phương án đã cân nhắc
1. **Dùng cả hai** — Next đọc DB cho trang đọc nhiều, NestJS cho nghiệp vụ phức tạp.
   Ưu: ít request hơn cho một số trang. Nhược: hai tầng backend chồng nhau, không ai biết
   logic nằm đâu, và frontend mất khả năng export static.
2. **Next chỉ gọi REST API** — Ưu: một nguồn logic duy nhất, backend test được độc lập,
   frontend export static được. Nhược: mọi trang đều cần một round-trip mạng.

### Quyết định
Next.js **không bao giờ** import `@prisma/client` và không truy cập database.

### Lý do
Với app một người dùng, chi phí một round-trip là không đáng kể. Đổi lại ta giữ được
hai thứ có giá trị lớn hơn nhiều: business logic ở đúng một nơi, và khả năng
`output: 'export'` → S3 + CloudFront với chi phí vài cent/tháng thay vì phải chạy
Next server trên Fargate.

### Hệ quả
**Tích cực:** ranh giới rõ ràng; Phase 13 có thêm phương án deploy rẻ.
**Cái giá phải trả:** hầu hết component phải là Client Component (`'use client'`);
không tận dụng được Server Component để giảm bundle; SEO kém (không quan trọng — dữ liệu riêng tư).
**Cách kiểm tra:** `frontend/package.json` không được có `prisma`; grep `@prisma/client`
trong `frontend/src` phải ra rỗng.

### Khi nào nên xem lại
Nếu app trở thành sản phẩm công khai cần SEO, hoặc nếu số round-trip trở thành vấn đề
hiệu năng đo được.

---

## ADR-003 — Collection thuộc Language, `levelId` nullable

- **Ngày:** 2026-09-18 · **Trạng thái:** Accepted · **Phase:** 0

### Bối cảnh
Yêu cầu mô tả cấu trúc cây `Japanese > N5 > Lesson 3`. Nhưng cũng yêu cầu chủ đề
`Japanese > Food` — gồm từ ở nhiều level khác nhau.

### Các phương án đã cân nhắc
1. **Collection thuộc Level** (phân cấp cứng) — Ưu: khớp đúng hình ảnh cây thư mục.
   Nhược: **không biểu diễn được** chủ đề xuyên level như `Food`.
2. **Ba entity riêng: Collection, Topic, Tag** — Ưu: mỗi khái niệm một chỗ.
   Nhược: cả ba **cùng một hình dạng** (một cái tên, chứa nhiều từ, một từ thuộc nhiều cái)
   → ba bảng, ba bảng nối, ba module CRUD cho cùng một khái niệm.
3. **Collection thuộc Language, `levelId` nullable, có cột `kind`** — một entity duy nhất.

### Quyết định
Phương án 3.

### Lý do
Một khóa ngoại nullable cho ta **cả hai** thứ: cây phân cấp (`levelId` có giá trị) và chủ
đề cắt ngang (`levelId = null`). `Topic` không cần tồn tại — nó là `Collection` với
`kind = TOPIC`, `levelId = null`.

### Hệ quả
**Tích cực:** tiết kiệm một bảng, một module CRUD, một màn hình quản lý.
**Cái giá phải trả:** UI phải xử lý hai trường hợp hiển thị khác nhau (trong cây level, và
nhóm "Topics" riêng). Truy vấn phải nhớ `levelId` có thể null.
**Khóa chúng ta vào:** ý niệm rằng "bài học" và "chủ đề" là cùng một loại đối tượng.

### Khi nào nên xem lại
Nếu Topic phát sinh thuộc tính riêng mà Collection không có (ví dụ: topic được chia sẻ
giữa nhiều ngôn ngữ), lúc đó tách entity là hợp lý.

---

## ADR-004 — Vocabulary ↔ Collection là Many-to-Many tường minh

- **Ngày:** 2026-09-18 · **Trạng thái:** Accepted · **Phase:** 0

### Bối cảnh
`食べる` phải thuộc đồng thời `Lesson 3`, `Food`, và `Daily Conversation`.

### Các phương án đã cân nhắc
1. **One-to-many + nhân bản từ** — nhân `食べる` thành 3 bản ghi.
   Nhược: 3 bản `LearningProgress` → ôn trùng; Dashboard đếm sai; sửa nghĩa phải sửa 3 chỗ;
   **không sửa được mà không đổi schema**.
2. **N-N ngầm của Prisma** (`Vocabulary[]` / `Collection[]`) — Ưu: ít code hơn.
   Nhược: bảng nối ngầm **không cho thêm cột**.
3. **N-N tường minh** với model `VocabularyCollection`.

### Quyết định
Phương án 3.

### Lý do
Ta đã cần `addedAt` ngay bây giờ, và nhiều khả năng cần `orderInLesson` (thứ tự từ trong
bài) sau này. Chuyển từ ngầm sang tường minh về sau là migration khó chịu trên dữ liệu thật.
Khai báo tường minh ngay tốn thêm năm dòng schema và không tốn gì khác.

### Hệ quả
**Tích cực:** thêm metadata vào quan hệ bất cứ lúc nào.
**Cái giá phải trả:** truy vấn dài dòng hơn (`collections: { create: [...] }` thay vì
`connect`); cập nhật danh sách collection phải bọc `$transaction`.

### Khi nào nên xem lại
Không. Đây là quyết định đúng cho mọi quy mô của dự án này.

---

## ADR-005 — Một bảng Vocabulary cho mọi ngôn ngữ + cột JSONB `extra`

- **Ngày:** 2026-09-18 · **Trạng thái:** Accepted · **Phase:** 0

### Bối cảnh
Tiếng Nhật cần kanji/kana/romaji; tiếng Trung cần hán tự/pinyin; tiếng Anh cần IPA.
Yêu cầu nêu rõ: **không được** tạo `JapaneseVocabulary` / `ChineseVocabulary` /
`EnglishVocabulary` thành các bảng riêng.

### Các phương án đã cân nhắc
1. **Bảng riêng mỗi ngôn ngữ** — mỗi ngôn ngữ mới = một bảng, một module, một màn hình.
   Không mở rộng được.
2. **Một bảng với đủ mọi cột của mọi ngôn ngữ** — bảng 40 cột, phần lớn null.
3. **Một bảng với cột chung đã trừu tượng hóa + JSONB cho phần đặc thù.**

### Quyết định
Phương án 3. Cột chung: `term`, `meaning`, `reading`, `romanization`, `exampleSentence`,
`exampleTranslation`, `notes`. Phần đặc thù: `extra Json?`.

### Lý do
`reading` bao được cả kana, pinyin có dấu, và IPA — chúng là **cùng một khái niệm**
("cách đọc") ở ba ngôn ngữ. Trừu tượng hóa đúng chỗ này loại bỏ được phần lớn nhu cầu về
cột riêng.

**Quy tắc quyết định:** field cần search/filter/sort → cột thật; field chỉ để hiển thị → `extra`.

### Hệ quả
**Tích cực:** thêm ngôn ngữ mới = thêm một dòng trong bảng `Language`, không đổi schema.
**Cái giá phải trả:** `extra` không được TypeScript kiểm tra kiểu (`Prisma.JsonValue`) →
phải validate bằng Zod trước khi dùng; query vào JSONB chậm hơn cột thật; phải giới hạn
kích thước `extra` ở tầng DTO nếu không sẽ nhận payload khổng lồ.

### Khi nào nên xem lại
Khi một field trong `extra` bắt đầu được dùng để filter/sort thường xuyên → thăng nó lên
thành cột thật bằng một migration.

---

## ADR-006 — Hoãn bảng User, nhưng mang `ownerId` từ đầu

- **Ngày:** 2026-09-18 · **Trạng thái:** Accepted · **Phase:** 0

### Bối cảnh
MVP chỉ có một người dùng. Nhưng Phase 12 có thể cần multi-user.

### Các phương án đã cân nhắc
1. **Làm auth đầy đủ ngay từ đầu** — chậm MVP đáng kể, xây thứ chưa ai cần.
2. **Hoãn hoàn toàn** — không có `ownerId` ở đâu cả. Phase 12 phải sửa chữ ký của mọi
   service method và mọi truy vấn Prisma.
3. **Hoãn bảng `User`, nhưng mang `ownerId` xuyên suốt code từ đầu.**

### Quyết định
Phương án 3. `Language`, `Vocabulary`, `LearningProgress`, `ReviewLog` có cột `ownerId`
(String, **chưa có khóa ngoại**), lấy từ decorator `@CurrentUser()` hiện đang trả về
`process.env.LOCAL_OWNER_ID`.

### Lý do
Cái khó khi thêm auth **không phải** là tạo bảng `User` (một migration, 10 phút). Cái khó
là threading `userId` qua mọi tầng — việc tốn hàng giờ và dễ bỏ sót, mà bỏ sót ở đây nghĩa
là lỗ hổng IDOR.

Chi phí hôm nay: một cột và một tham số. Tiết kiệm về sau: một buổi refactor rủi ro.

### Hệ quả
**Tích cực:** Phase 12 chỉ cần tạo bảng `User`, thêm FK, và thay thân hàm decorator.
Không chữ ký hàm nào phải sửa.
**Cái giá phải trả:** mọi truy vấn phải nhớ `ownerId` — và **sai sót ở đây không có triệu
chứng nào** ở MVP vì chỉ có một owner. Đây chính là lý do Quality Gate G4 kiểm tra 100%
lời gọi Prisma mỗi phase.
**Rủi ro đã nhận diện:** nếu G4 bị bỏ qua vài phase liên tiếp, lỗ hổng sẽ tích lũy âm thầm.

### Khi nào nên xem lại
Ngay tại Phase 12 — lúc đó `ownerId` trở thành khóa ngoại thật.

---

## ADR-007 — Cột SRS tạo sẵn ở Phase 9, thuật toán để Phase 11

- **Ngày:** 2026-09-18 · **Trạng thái:** Accepted · **Phase:** 0

### Bối cảnh
Spaced Repetition là mục tiêu dài hạn nhưng yêu cầu nêu rõ: không triển khai phức tạp ngay.

### Các phương án đã cân nhắc
1. **Không tạo gì cả** — Phase 11 sẽ phải migrate trên dữ liệu đã dùng vài tháng.
2. **Triển khai SM-2 ngay** — xây thuật toán khi chưa có dữ liệu để đánh giá nó tốt hay không.
3. **Tạo sẵn cột, để trống, chưa có thuật toán.**

### Quyết định
Phương án 3. `LearningProgress` có `dueAt`, `intervalDays`, `easeFactor`, `repetitions`
với giá trị mặc định. MVP không đọc không ghi chúng. `ReviewLog` được tạo ở Phase 9.

### Lý do
Bốn cột tốn đúng bốn cột trống. Đổi lại, Phase 11 trở thành **một hàm thuần túy** —
nhận `(easeFactor, intervalDays, repetitions, rating)` trả về giá trị mới — **không cần
migration** trên dữ liệu thật.

`ReviewLog` từ Phase 9 còn cho một lợi ích thứ hai: FSRS cần lịch sử ôn tập thật để hoạt
động tốt. Không ghi log từ đầu thì Phase 11 bắt đầu từ con số không.

### Hệ quả
**Tích cực:** Phase 11 rẻ và ít rủi ro. Có sẵn dữ liệu để đánh giá thuật toán.
**Cái giá phải trả:** bốn cột "chết" trong schema vài tháng — có thể gây nhầm lẫn cho
người đọc schema (đã ghi chú rõ trong `DATABASE.md`).

### Khi nào nên xem lại
Sau 2-4 tuần dùng app thật và có vài trăm dòng `ReviewLog`. Lúc đó mới chọn giữa Leitner
(đơn giản), SM-2 (kinh điển), FSRS (hiện đại) — dựa trên dữ liệu thật chứ không phải
cảm tính.

---

## ADR-008 — Quy trình AI-assisted: session chính viết code, subagent kiểm chứng

- **Ngày:** 2026-09-18 · **Trạng thái:** Accepted · **Phase:** 0

### Bối cảnh
Mục tiêu của dự án là **học**, không chỉ là có app chạy được. Cần một quy trình dùng AI
mà không biến chủ dự án thành người bấm nút phê duyệt những thứ mình không đọc.

### Các phương án đã cân nhắc
1. **Agent `orchestrator` điều phối các agent khác** (bố cục ban đầu) — Ưu: một lệnh chạy
   cả pipeline. Nhược: đẩy con người ra khỏi vòng lặp; mọi Quality Gate thành hình thức
   vì "người duyệt" cũng là AI.
2. **Subagent viết toàn bộ code** — Ưu: nhanh. Nhược: subagent làm việc trong ngữ cảnh
   riêng và chỉ trả kết quả cuối → con người không thấy quá trình suy nghĩ → không học được gì.
3. **Session chính viết code mới (kèm giải thích); subagent chỉ kiểm chứng; orchestration
   nằm ở slash command do con người gõ.**

### Quyết định
Phương án 3. Năm subagent: `architect` (thiết kế), `coder` (việc cơ học đã có mẫu),
`tester`, `reviewer` (chỉ đọc), `security` (chỉ đọc). Không có agent `orchestrator`.

### Lý do
- Code mới do session chính viết → con người thấy được lập luận → Quality Gate G5
  ("tôi có hiểu code này không") mới có ý nghĩa.
- `reviewer` và `security` là subagent riêng với **ngữ cảnh sạch**: một model vừa viết
  xong code có xu hướng thấy nó hợp lý — nó vừa tự thuyết phục mình rằng cách đó đúng.
  Một model khác không có ký ức đó, và chỉ thấy code như nó thật sự là.
- `reviewer`/`security` **chỉ đọc** để không "tiện tay sửa luôn" — điều đó sẽ xóa mất bản
  ghi về việc code đã sai như thế nào.
- Orchestration nằm ở slash command → **con người là bộ điều phối**.

### Hệ quả
**Tích cực:** con người luôn ở trong vòng lặp; có review chéo thật; quyết định luôn thuộc
về con người.
**Cái giá phải trả:** chậm hơn đáng kể so với để AI chạy tự động. Mỗi phase cần con người
có mặt ở ít nhất ba thời điểm (G0, sau G4, G5).
**Đây là đánh đổi có chủ đích:** gate chậm là tính năng, không phải nhược điểm.

### Khi nào nên xem lại
Nếu sau vài phase, việc dừng ở mỗi gate trở thành nghi thức hình thức (đọc lướt rồi bấm
đồng ý), thì quy trình đang không hoạt động — lúc đó nên **giảm số gate** thay vì giả vờ
tuân thủ chúng.

---

## ADR-009 — Theo mặc định NestJS 12 (ESM, Vitest, oxlint) + Prisma 7 ghim phiên bản

- **Ngày:** 2026-09-19 · **Trạng thái:** Accepted · **Phase:** 1

### Bối cảnh
Tài liệu Phase 0 được viết với giả định NestJS 11: CommonJS, Jest, ESLint. Khi bắt đầu
Phase 1, phiên bản ổn định mới nhất là **NestJS 12**, và CLI chính thức sinh ra một bộ công
cụ khác hẳn: **ESM** (`"type": "module"`, import phải có đuôi `.js`), **Vitest** thay Jest,
**oxlint** (type-aware) thay ESLint, TypeScript 6.

Cùng lúc, `@prisma/client` ổn định ở **7.10.0**, nhưng tag `latest` của gói CLI `prisma`
đang trỏ nhầm vào bản thử nghiệm `8.0.0-rc.15`. Prisma 7 cũng thay đổi lớn so với 6:
bắt buộc dùng driver adapter, cấu hình kết nối chuyển sang `prisma.config.ts`.

### Các phương án đã cân nhắc
1. **Ép NestJS 12 về CommonJS + Jest + ESLint** để khớp tài liệu cũ.
   Nhược: đi ngược mặc định của framework; mỗi lần đọc tài liệu chính thức hay nâng cấp
   đều phải tự "dịch" lại; Jest với ESM là nguồn lỗi cấu hình kinh điển.
2. **Dùng NestJS 11 (tag `legacy`) + Prisma 6** — bộ đôi quen thuộc, nhiều tutorial.
   Nhược: bắt đầu một dự án mới trên phiên bản đã bị gắn nhãn legacy; sớm muộn phải nâng
   cấp trên code đã viết.
3. **Theo đúng mặc định của NestJS 12, dùng Prisma 7, ghim phiên bản chính xác.**

### Quyết định
Phương án 3.
- Backend: ESM, Vitest, oxlint, Prettier — đúng như `nest new` sinh ra.
- Prisma CLI và `@prisma/client` **ghim cùng phiên bản `7.10.0`** (không dùng `^`),
  vì hai gói lệch phiên bản sẽ sinh client không tương thích.
- Frontend giữ **ESLint** (mặc định của Next.js, có rule riêng cho Next như
  `next/core-web-vitals` mà oxlint chưa thay thế hết).

### Lý do
Với người đang học, chi phí lớn nhất không phải là học công cụ mới, mà là **cấu hình ngược
với tài liệu chính thức**. Theo mặc định nghĩa là mọi hướng dẫn chính thức áp dụng thẳng
vào dự án. ESM cũng là hướng đi của toàn bộ hệ sinh thái Node — Prisma 7 cũng là ESM, nên
hai thứ khớp nhau tự nhiên thay vì phải nối qua lớp tương thích.

### Hệ quả
**Tích cực:** khớp tài liệu chính thức; Vitest và oxlint nhanh hơn Jest/ESLint đáng kể.
**Cái giá phải trả:**
- Import nội bộ phải có đuôi `.js` (`import { X } from './x.js'`) dù file là `.ts`.
  Đây là quy tắc của ESM trong Node, không phải lỗi đánh máy.
- Ít tutorial tiếng Việt/cộng đồng cho NestJS 12 + Vitest hơn so với NestJS 11 + Jest.
- Test dùng `vi.fn()` thay cho `jest.fn()`.
- Frontend và backend dùng hai linter khác nhau.
**Đã cập nhật theo:** PLAN.md (F0-08, F0-12), skill `project-testing`, `backend-nestjs`.

### Khi nào nên xem lại
Khi Prisma CLI có bản 8 ổn định (tag `latest` trỏ về bản không phải RC) — lúc đó nâng cả
hai gói cùng lúc, có kế hoạch riêng.

---

## ADR-010 — Quy tắc chuyển trạng thái học: chuỗi trả lời đúng liên tiếp

- **Ngày:** 2026-10-06 · **Trạng thái:** Accepted · **Phase:** 9
- **Người quyết định:** Claude Code, theo ủy quyền "tự ra quyết định" của chủ dự án
  (2026-10-06). Chủ dự án nên đọc lại mục này khi nghiệm thu (F11).

### Bối cảnh
MVP cần bốn trạng thái `NEW → LEARNING → REVIEW → MASTERED` nhưng **chưa** có Spaced
Repetition (ADR-007). Cần một quy tắc đủ đơn giản để giải thích bằng một câu, đủ đúng để
"Review Due Words" chọn ra những từ thật sự chưa thuộc.

### Các phương án đã cân nhắc
1. **Theo tỷ lệ đúng tích lũy** (`correctCount / reviewCount`). Nhược: không hạ cấp được —
   một từ đã đúng 20 lần thì sai 5 lần liền vẫn "MASTERED". Tỷ lệ tích lũy nhớ quá khứ quá lâu.
2. **Theo số lần đúng tích lũy** (đúng 3 lần → REVIEW, 6 lần → MASTERED). Cùng nhược điểm,
   và trả lời sai không có hậu quả gì.
3. **Theo chuỗi trả lời đúng liên tiếp** (`correctStreak`), sai thì chuỗi về 0 và tụt một bậc.
4. **Dùng luôn cột `repetitions` của SM-2** làm chuỗi. Nhược: vi phạm ADR-007 (MVP không
   đọc/ghi cột SRS) và trói Phase 11 vào ý nghĩa mà MVP đã tự gán.

### Quyết định
Phương án 3, với **một cột mới `correctStreak`** trên `LearningProgress`.

**Bước 1 — mỗi lần ôn quy về đúng/sai và cập nhật chuỗi:**

| Nguồn | Kết quả | `correctStreak` |
|---|---|---|
| Flashcard `AGAIN` | sai | về 0 |
| Flashcard `HARD` | đúng | giữ nguyên (nhớ ra nhưng chật vật: chưa tiến bộ) |
| Flashcard `GOOD` | đúng | +1 |
| Flashcard `EASY` | đúng | +2 |
| Quiz đúng | đúng | +1 |
| Quiz sai | sai | về 0 |

**Bước 2 — trạng thái mới:**
- **Sai:** tụt đúng một bậc — `MASTERED → REVIEW`, `REVIEW → LEARNING`, còn lại là `LEARNING`.
- **Đúng:** mức theo chuỗi là `MASTERED` nếu chuỗi ≥ 5, `REVIEW` nếu ≥ 2, ngược lại
  `LEARNING`. Trạng thái mới = mức **cao hơn** giữa trạng thái hiện tại và mức theo chuỗi
  (trả lời đúng không bao giờ làm tụt bậc).
- Từ chưa ôn lần nào là `NEW`; lần ôn đầu tiên luôn đưa nó ra khỏi `NEW`.

Toàn bộ là một **hàm thuần** `applyReview()` trong `backend/src/learning/progress-rules.ts`.

### Lý do
Chuỗi liên tiếp phản ánh **trí nhớ hiện tại**, không phải lịch sử: quên là thấy ngay. Quy
tắc giải thích được trong một câu ("đúng 2 lần liền thì sang Ôn tập, 5 lần liền thì Thuộc;
sai thì tụt một bậc"). Tụt **một** bậc thay vì về thẳng `LEARNING` để một lần bấm nhầm
không xóa công sức nhiều tuần.

### Hệ quả
**Tích cực:** quy tắc nằm trọn trong một hàm, test phủ mọi nhánh; Phase 11 thay hàm này
bằng SM-2/FSRS mà **không đổi contract** của `POST /learning/review`.
**Cái giá phải trả:** thêm một cột ngoài thiết kế Phase 0 (`correctStreak`). Ngưỡng 2 và 5
là phán đoán, chưa dựa trên dữ liệu — không có khái niệm thời gian, nên 5 lần đúng trong
5 phút cũng thành `MASTERED`.
**`ReviewLog.isCorrect` luôn được ghi** (với flashcard: suy ra từ `rating`), khác với ghi chú
"chỉ cho quiz" ở DATABASE.md bản Phase 0 — để Dashboard đếm đúng/sai bằng một cột duy nhất.

### Khi nào nên xem lại
Phase 11. Khi có thuật toán SRS thật, `status` nên được suy ra từ `intervalDays`, và
`correctStreak` có thể bỏ. Xem lại sớm hơn nếu sau 1–2 tuần dùng thật (F11-05) thấy từ lên
`MASTERED` quá nhanh.

---

## ADR-011 — "Hôm nay" tính theo múi giờ cấu hình ở backend (`APP_TIMEZONE`)

- **Ngày:** 2026-10-06 · **Trạng thái:** Accepted · **Phase:** 10
- **Người quyết định:** Claude Code, theo ủy quyền "tự ra quyết định" của chủ dự án
  (2026-10-06). Chủ dự án nên đọc lại mục này khi nghiệm thu (F11).

### Bối cảnh
Dashboard cần "hôm nay đã ôn bao nhiêu từ" và "chuỗi ngày học liên tiếp". Database lưu
`reviewedAt` theo UTC. Nếu cắt ngày theo UTC, người ở Việt Nam (UTC+7) sẽ thấy thống kê
"hôm nay" reset lúc **7 giờ sáng**, và buổi học lúc 6 giờ sáng bị tính vào hôm qua.

### Các phương án đã cân nhắc
1. **Cắt ngày theo UTC.** Đơn giản nhất, và sai với mọi người dùng không sống ở UTC.
2. **Frontend gửi kèm offset** (`?tzOffset=-420`). Đúng cho người dùng di chuyển, nhưng mỗi
   request phải mang theo offset, backend phải tin một con số do client gửi, và chuỗi ngày
   học có thể nhảy lung tung khi offset đổi giữa chừng.
3. **Backend cấu hình một múi giờ** qua biến môi trường `APP_TIMEZONE`.

### Quyết định
Phương án 3. `APP_TIMEZONE` là tên múi giờ IANA, mặc định `Asia/Ho_Chi_Minh`, được kiểm tra
lúc khởi động (tên sai → app dừng với thông báo rõ).

- Ranh giới ngày tính bằng hàm thuần `dayRange(now, timeZone)` trong
  `backend/src/learning/time-zone.ts` — trả về hai mốc UTC `[start, end)` của "hôm nay".
- Chuỗi ngày học: database quy đổi `reviewedAt` sang ngày địa phương
  (`AT TIME ZONE`), hàm thuần `countStreak()` đếm số ngày liên tiếp.
- **Chuỗi chưa đứt khi hôm nay chưa học:** nếu hôm nay chưa ôn nhưng hôm qua có, chuỗi vẫn
  được tính tới hôm qua. Chuỗi chỉ về 0 khi bỏ trọn một ngày.
- `accuracy` là `null` (không phải `0`) khi hôm nay chưa ôn từ nào — "chưa có dữ liệu" khác
  với "sai hết".
- `GET /learning/stats` **không** nhận `from`/`to` như bản thiết kế Phase 0: chưa có màn
  hình nào cần khoảng ngày tùy ý.

### Lý do
MVP có đúng một người dùng ở đúng một múi giờ. Một biến môi trường giải quyết trọn vấn đề
mà không thêm tham số nào vào API. Tách phần tính ngày thành hàm thuần nhận `now` làm tham
số để test được ranh giới (23:59 / 00:00) mà không phải giả lập đồng hồ hệ thống.

### Hệ quả
**Tích cực:** thống kê đúng với cảm nhận của người dùng; logic ngày giờ test được trọn vẹn.
**Cái giá phải trả:** đi công tác sang múi giờ khác thì "hôm nay" vẫn theo giờ Việt Nam cho
tới khi đổi cấu hình. Múi giờ có DST (không phải Việt Nam) có hai ngày mỗi năm dài 23/25
giờ — `dayRange` xử lý đúng mốc đầu/cuối, có test cho `America/New_York`.

### Khi nào nên xem lại
Phase 12 (multi-user): múi giờ phải thành thuộc tính của từng `User`, không còn là cấu hình
chung của server.

---

## ADR-012 — Spaced Repetition bằng SM-2; trạng thái suy ra từ khoảng cách ôn

- **Ngày:** 2026-10-07 · **Trạng thái:** Accepted · **Phase:** 11
- **Thay thế:** phần "Bước 2 — trạng thái mới" của ADR-010. Phần quy về đúng/sai và bộ đếm
  của ADR-010 vẫn còn hiệu lực.
- **Người quyết định:** Claude Code, theo ủy quyền "tự ra quyết định" của chủ dự án
  (2026-10-07). Chủ dự án nên đọc lại mục này.

### Bối cảnh
MVP chọn từ cần ôn bằng trạng thái (`NEW`/`LEARNING`): một từ đã lên `REVIEW` thì **không
bao giờ** quay lại danh sách ôn, dù ba tháng không đụng tới. Thứ còn thiếu là khái niệm
**thời gian**: từ nào, khi nào cần ôn lại. ADR-007 đã để sẵn bốn cột
(`dueAt`, `intervalDays`, `easeFactor`, `repetitions`) cho việc này.

ADR-007 muốn chọn thuật toán sau 2–4 tuần dữ liệu thật. Chủ dự án quyết định làm ngay, nên
lựa chọn dưới đây dựa trên đặc tính thuật toán, **chưa** dựa trên dữ liệu của chính app.

### Các phương án đã cân nhắc
1. **Leitner** — 5 hộp, đúng thì lên hộp, sai thì về hộp 1; mỗi hộp một khoảng cách cố định.
   Dễ hiểu nhất, nhưng mọi từ đi cùng một lịch: từ dễ và từ khó được ôn dày như nhau.
2. **SM-2** — mỗi từ có "hệ số dễ" riêng; khoảng cách lần sau = khoảng cách lần trước × hệ
   số. Bốn mức chấm hiện có (Quên/Khó/Được/Dễ) khớp thẳng vào thang điểm của nó.
3. **FSRS** — mô hình hiện đại, chính xác hơn SM-2, nhưng có khoảng 20 tham số phải tối ưu
   từ lịch sử ôn tập. Chưa có lịch sử thì chạy bằng tham số mặc định, và cần thêm cột
   (`stability`, `difficulty`) ngoài bốn cột đã có.

### Quyết định
**SM-2**, cài đặt thành hàm thuần `schedule()` trong `backend/src/learning/srs.ts`.

**Quy đổi lần ôn sang điểm chất lượng `q`:**

| Nguồn | `q` |
|---|---|
| Flashcard `AGAIN`, quiz sai | 1 |
| Flashcard `HARD` | 3 |
| Flashcard `GOOD`, quiz đúng | 4 |
| Flashcard `EASY` | 5 |

**Lịch ôn:**
- `q < 3` (quên): `repetitions = 0`, `intervalDays = 0` → **đến hạn ngay**, từ ở lại danh
  sách ôn cho tới khi trả lời được.
- `q ≥ 3`: lần đúng thứ nhất → 1 ngày; lần thứ hai → 6 ngày; từ lần thứ ba →
  `round(khoảng cách trước × easeFactor)`, tối đa 365 ngày.
- `easeFactor` cập nhật sau **mọi** lần ôn: `EF + (0.1 − (5−q)·(0.08 + (5−q)·0.02))`, không
  thấp hơn 1.3. Khởi đầu 2.5.
- `dueAt` = **00:00 giờ địa phương** (`APP_TIMEZONE`, ADR-011) của ngày hôm nay +
  `intervalDays`. Ôn lúc 9 giờ sáng hay 11 giờ đêm thì từ "1 ngày" đều đến hạn từ đầu ngày
  mai — lịch ôn theo NGÀY, không theo giờ.

**Trạng thái suy ra từ lịch ôn** (không còn theo chuỗi đúng liên tiếp):
- chưa ôn lần nào → `NEW`
- `repetitions = 0` (vừa quên, hoặc chưa đúng lần nào) → `LEARNING`
- `intervalDays ≥ 21` → `MASTERED` (ngưỡng "thẻ trưởng thành" quen dùng của Anki)
- còn lại → `REVIEW`

**Từ cần ôn** (`GET /learning/due`, `dueCount`): chưa ôn lần nào, **hoặc** `dueAt ≤ bây giờ`.
Thứ tự: từ quá hạn lâu nhất trước, từ mới sau cùng — nợ cũ trả trước khi vay mới.

**Dữ liệu cũ:** dòng `LearningProgress` tạo trước Phase 11 có `dueAt = NULL` và được coi là
đến hạn ngay. Không cần migration dữ liệu; lần ôn kế tiếp sẽ xếp lịch cho nó.

### Lý do
SM-2 dùng đúng bốn cột đã chuẩn bị từ Phase 9 — **không có migration schema nào**. Nó đủ
đơn giản để đọc hết trong một hàm 20 dòng và kiểm chứng bằng tay (1 → 6 → 15 → 38 ngày), điều
quan trọng với một dự án để học. FSRS tốt hơn về lý thuyết nhưng lợi thế của nó đến từ việc
khớp tham số với dữ liệu cá nhân — thứ app này chưa có.

Suy trạng thái từ `intervalDays` sửa đúng điểm yếu ADR-010 tự nêu: "5 lần đúng trong 5 phút
cũng thành `MASTERED`". Giờ muốn `MASTERED` phải trụ được qua các khoảng cách 1, 6, 15 ngày.

### Hệ quả
**Tích cực:** "Ôn tập" trở thành việc làm mỗi ngày với số lượng tự giảm dần; contract của
`POST /learning/review` và `GET /learning/due` không đổi (chỉ thêm field).
**Cái giá phải trả:**
- Học trước hạn (qua "Học" thay vì "Ôn tập") vẫn được tính như một lần ôn đúng hạn và đẩy
  lịch xa thêm — SM-2 gốc không phân biệt.
- Không giới hạn số từ mới mỗi ngày: thêm 200 từ thì cả 200 đều nằm trong danh sách ôn.
- `correctStreak` (ADR-010) vẫn được ghi nhưng không còn quyết định trạng thái.
- Từ đã `MASTERED` theo quy tắc cũ sẽ được tính lại trạng thái ở lần ôn kế tiếp.

### Khi nào nên xem lại
Khi `ReviewLog` có vài nghìn dòng: đủ dữ liệu để khớp tham số FSRS và so sánh tỷ lệ nhớ
thực tế với SM-2. Xem lại sớm hơn nếu số từ đến hạn mỗi ngày vượt quá sức ôn — khi đó thêm
giới hạn từ mới mỗi ngày trước khi nghĩ tới đổi thuật toán.
