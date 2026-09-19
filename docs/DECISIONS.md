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
