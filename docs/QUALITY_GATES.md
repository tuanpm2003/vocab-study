# QUALITY GATES

> Sáu cửa kiểm soát. Code không được đi tiếp khi chưa qua cửa hiện tại.
> Mỗi gate ghi rõ: **ai chạy**, **chạy bằng gì**, **tiêu chí pass**, **ai được miễn trừ**.

Quy trình tổng thể ở [WORKFLOW.md](WORKFLOW.md).

---

## Bảng tổng quan

| Gate | Tên | Ai chạy | Cưỡng chế bằng | Được miễn trừ? |
|---|---|---|---|---|
| **G0** | Design Gate | Con người duyệt | Quy ước + `/phase-plan` dừng lại | Có — với thay đổi nhỏ, rõ ràng |
| **G1** | Build Gate | Máy | `npm run build`, `npm run lint` | **Không** |
| **G2** | Test Gate | Subagent `tester` | `npm run test`, `test:e2e` | Có — với phase thuần UI |
| **G3** | Review Gate | Subagent `reviewer` | Đọc code, báo cáo | Có — với thay đổi dưới ~20 dòng |
| **G4** | Security Gate | Subagent `security` | Checklist + grep | Có — nếu phase không đụng dữ liệu/input |
| **G5** | Human Gate | **Con người** | Chạy app thật, đọc code | **Không bao giờ** |

Miễn trừ phải được **ghi lại** trong commit message hoặc CHANGELOG, kèm lý do.
Miễn trừ im lặng là cách quy trình này mục ruỗng.

---

## G0 — Design Gate

**Câu hỏi:** *Chúng ta có đang giải đúng bài toán, bằng cách đơn giản nhất có thể không?*

Chạy **trước khi viết dòng code đầu tiên** của phase.

### Tiêu chí pass

- [ ] Kế hoạch được trình bày đủ 10 mục Mentor Mode
- [ ] Mục 3 (Kiến thức cần biết trước) giải thích mọi khái niệm mới **trước khi** dùng
- [ ] Mục 4 liệt kê chính xác file nào tạo, file nào sửa
- [ ] Nếu đụng schema hoặc API contract → đã có ADR trong `docs/DECISIONS.md`
- [ ] Không có entity/module/bảng nào được thêm mà phase này chưa dùng đến
- [ ] Kế hoạch dưới ~6 bước code (nếu hơn → chia phase)
- [ ] **Con người đã đọc và nói "đồng ý"**

### Ai được miễn trừ

Thay đổi nhỏ và rõ ràng (sửa một thông điệp lỗi, thêm một field hiển thị) không cần
kế hoạch 10 mục. Nhưng bất cứ thay đổi nào đụng `schema.prisma` thì **không bao giờ**
được miễn.

---

## G1 — Build Gate

**Câu hỏi:** *Code có compile và có sạch không?*

```powershell
cd backend;  npm run build
cd backend;  npm run lint
cd backend;  npm run format:check
cd frontend; npm run build
cd frontend; npm run lint
cd frontend; npm run format:check
```

### Tiêu chí pass

- [ ] `tsc` không lỗi
- [ ] Linter không có error — backend oxlint, frontend ESLint (warning thì được, nhưng phải giảm dần)
- [ ] **Không có `any` mới** trong diff
- [ ] Không có `console.log` sót lại trong `backend/src` hoặc `frontend/src`
- [ ] `npx prisma validate` pass (nếu phase đụng schema)

### Không được miễn trừ

Đây là gate rẻ nhất và tuyệt đối nhất. Nếu G1 fail thì **dừng ngay**, không chạy G2-G4.
Gọi reviewer đi review code chưa compile được là lãng phí thời gian của cả hai bên.

---

## G2 — Test Gate

**Câu hỏi:** *Code có làm đúng việc nó nói không, kể cả ở các trường hợp biên?*

Chạy bởi subagent `tester`. Chi tiết ở skill `project-testing`.

### Tiêu chí pass

- [ ] Mọi test hiện có vẫn pass (không có regression)
- [ ] Mọi method public của service mới có ít nhất happy path + một nhánh lỗi
- [ ] Mọi endpoint mới có ít nhất một integration test
- [ ] **Có test cách ly `ownerId`**: dữ liệu của owner A không lộ cho owner B
- [ ] Có test với dữ liệu Unicode thật (食べる, 你好, tiếng Việt có dấu)
- [ ] Đã test các trường hợp biên bắt buộc theo checklist trong `project-testing`
- [ ] **Không có test nào bị `skip` mà không giải thích**

### Quy tắc tuyệt đối

> **Không bao giờ sửa code nguồn để test xanh.**
> Test fail nghĩa là: (a) test viết sai → sửa test, hoặc (b) code có bug → báo cáo bug.
> Xác định rõ (a) hay (b) **trước khi** sửa bất cứ thứ gì.

### Ai được miễn trừ

Phase thuần UI (ví dụ: chỉnh layout, đổi màu) có thể bỏ qua G2. Phase có bất kỳ logic
nào — kể cả logic trong component — thì không.

---

## G3 — Review Gate

**Câu hỏi:** *Người khác nhìn vào code này có thấy vấn đề gì không?*

Chạy bởi subagent `reviewer` (chỉ đọc). Checklist ở skill `review-checklist`.

### Tiêu chí pass

- [ ] **Không còn phát hiện nào ở mức NGHIÊM TRỌNG**
- [ ] Phát hiện mức ĐÁNG CHÚ Ý đã được con người xem và quyết định (sửa / hoãn / bác bỏ)
- [ ] Phát hiện mức NHỎ đã được ghi vào `docs/TODO.md` nếu quyết định hoãn
- [ ] Không có N+1 query mới
- [ ] Mọi truy vấn Prisma có `ownerId` trong `where`
- [ ] Code mới nhất quán với module `languages` (module mẫu của dự án)

### Tại sao phải là một agent riêng

Model vừa viết xong một đoạn code có xu hướng thấy nó hợp lý — nó vừa tự thuyết phục mình
rằng cách làm đó đúng. Một agent khác với ngữ cảnh sạch không có ký ức đó; nó chỉ nhìn
thấy code như code thật sự là. Đây chính là lý do "review chéo" tồn tại trong đội ngũ người,
và nó áp dụng y hệt cho AI.

### Ai được miễn trừ

Thay đổi dưới khoảng 20 dòng và thuần cơ học (đổi tên biến, thêm một field vào DTO đã có).

---

## G4 — Security Gate

**Câu hỏi:** *Code này có tạo ra lỗ hổng nào không — kể cả lỗ hổng chưa có triệu chứng?*

Chạy bởi subagent `security` (chỉ đọc). Checklist ở skill `security-checklist`.

### Tiêu chí pass

- [ ] **Đã đối chiếu 100% lời gọi Prisma có `ownerId` trong `where`** — báo cáo phải ghi
      rõ số lượng đã kiểm tra (N/N), không được nói chung chung
- [ ] Không có secret hard-code trong source
- [ ] Không có secret nào mang prefix `NEXT_PUBLIC_`
- [ ] `ValidationPipe` có `whitelist: true` và `forbidNonWhitelisted: true`
- [ ] `limit` có `@Max(100)`, `page` có `@Min(1)`
- [ ] `sort` được whitelist
- [ ] Không có `$queryRawUnsafe` hoặc `$queryRaw` nối chuỗi
- [ ] Thông điệp lỗi không lộ stack trace / SQL / tên bảng / đường dẫn file
- [ ] Phát hiện nhóm "TRƯỚC KHI LÊN MẠNG" đã được ghi vào `docs/TODO.md`

### Rủi ro đặc thù của dự án này

Cách ly `ownerId` **không có triệu chứng nào ở MVP** vì chỉ có một owner. Nghĩa là nếu
để lọt, bạn sẽ không phát hiện được bằng cách dùng thử app. G4 là lớp phòng thủ duy nhất
cho tới Phase 12 — và đến lúc đó, sửa lại toàn bộ sẽ đắt hơn nhiều so với làm đúng từ đầu.

### Ai được miễn trừ

Phase hoàn toàn không đụng tới dữ liệu người dùng, input, hay cấu hình
(ví dụ: thêm một trang tĩnh giới thiệu).

---

## G5 — Human Gate

**Câu hỏi:** *Tôi đã tự chạy chưa, và tôi có hiểu code này không?*

### Tiêu chí pass

- [ ] **Bạn tự chạy app** và tự thao tác tính năng vừa làm — không phải đọc mô tả của AI
- [ ] Kết quả thật khớp với mục 8 "Kết quả mong đợi" trong kế hoạch G0
- [ ] Bạn đã mở Prisma Studio và nhìn thấy dữ liệu thật trong database
- [ ] **Bạn có thể giải thích lại cho người khác** code này hoạt động thế nào
- [ ] Không còn file nào trong diff mà bạn không biết nó làm gì
- [ ] Bạn trả lời được mục 10 "Tôi nên hiểu được gì sau Phase này?"

### Không bao giờ được miễn trừ

Đây là gate duy nhất AI **không thể** tự xác nhận, và là lý do tồn tại của toàn bộ dự án này.

Nếu bạn qua G5 mà không thật sự hiểu code, bạn đang tích lũy một vùng tối trong codebase.
Mỗi vùng tối làm phase sau khó hơn, vì bạn không kiểm chứng được những thay đổi đụng vào nó.
Sau vài phase như vậy, bạn không còn là người kiểm soát dự án nữa — bạn chỉ còn là người
bấm nút phê duyệt những thứ mình không đọc được.

Khi G5 fail: **dừng phase, gõ `/explain`**. Đây là lúc quy trình này tạo ra giá trị lớn nhất.

---

## Gate cho các phase đặc biệt

| Phase | Gate bổ sung |
|---|---|
| Bất kỳ phase nào đụng `schema.prisma` | G0 bắt buộc có ADR. Migration phải chạy được trên DB rỗng **và** DB đã có dữ liệu |
| Phase 11 — Spaced Repetition | Thuật toán phải phủ **mọi nhánh** bằng unit test. Không có ngoại lệ |
| Phase 12 — Authentication | G4 chạy lại trên **toàn bộ** codebase, không chỉ diff |
| Phase 13 — AWS | Toàn bộ mục "TRƯỚC KHI LÊN MẠNG" trong `security-checklist` phải xong. Backup phải được **thử khôi phục** một lần |

---

## Ghi lại kết quả gate

Commit message của `/phase-close` phải có dòng:

```
Phase 2. Quality gates: G1 ✅ G2 ✅ G3 ✅ G4 ⊘(miễn: không đụng input) G5 ✅
```

Ký hiệu: `✅` pass, `⊘` miễn trừ (kèm lý do), `⚠️` pass có điều kiện (kèm mục TODO).

Nếu sáu tháng sau có bug, dòng này cho bạn biết ngay phase đó đã được kiểm tra tới mức nào.
