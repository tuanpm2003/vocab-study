# TESTING

> Chiến lược test của dự án. Mẫu code và checklist trường hợp biên ở skill `project-testing`.
> Tiêu chí pass của Test Gate ở [QUALITY_GATES.md § G2](QUALITY_GATES.md).

---

## 1. Nguyên tắc

### Test hành vi, không test cách cài đặt

Test tốt mô tả **app làm gì**. Test tồi mô tả **code được viết thế nào** — nó vỡ mỗi lần
bạn refactor dù hành vi không đổi, và dần dần bạn sẽ ghét việc chạy test rồi bỏ luôn.

*Cách tự kiểm tra:* nếu bạn đổi tên một biến private trong service mà test fail, test đó viết sai.

### Không bao giờ sửa code nguồn để test xanh

Test fail nghĩa là một trong hai: **test viết sai** (sửa test) hoặc **code có bug**
(báo cáo bug). Phải xác định rõ là cái nào **trước khi** sửa bất cứ thứ gì.

Đây là quy tắc quan trọng nhất trong tài liệu này. Vi phạm nó một lần là mất toàn bộ giá
trị của hệ thống test.

### Không viết test cho đủ chỉ tiêu

Không đặt mục tiêu phần trăm coverage tổng thể — nó khuyến khích viết test vô nghĩa cho
getter/setter để nâng con số. Mục tiêu là **phủ đúng chỗ có logic**.

---

## 2. Test ở tầng nào

| Ưu tiên | Loại | Ở đâu | Test gì | Mock gì |
|---|---|---|---|---|
| 1 | **Unit — Service** | `backend/src/**/*.service.spec.ts` | Business logic, nhánh điều kiện, ném exception | `PrismaService` |
| 2 | **Integration — API** | `backend/test/*.e2e-spec.ts` | Request → response, DTO validate, status code | Không mock |
| 3 | **Component** | `frontend/src/**/*.test.tsx` | Form giữ state, flashcard lật mặt | `apiFetch` |
| 4 | **E2E** | (sau MVP) | Flow đầy đủ qua trình duyệt | Không mock |

**Ưu tiên 1 và 2 là bắt buộc.** Đó là nơi có logic thật và nơi bug gây hậu quả thật
(sai dữ liệu trong database).

**Component test chỉ viết cho component CÓ logic.** Component chỉ hiển thị (card, badge,
layout) thì test không đáng công sức — nó chỉ xác nhận lại đúng cái bạn vừa viết.

**E2E để sau MVP.** Nó chậm, hay vỡ vặt vãnh, và cần hạ tầng riêng. Với một người dùng duy
nhất tự chạy app mỗi ngày, Quality Gate G5 (con người tự chạy) đã đóng phần lớn vai trò
của E2E.

---

## 3. Hạ tầng test

### Database test riêng

```yaml
# docker-compose.yml
postgres-test:
  image: postgres:16-alpine
  ports: ["5433:5432"]            # ← port KHÁC với dev (5434)
  environment:
    POSTGRES_DB: vocab_test
```

E2E đọc `TEST_DATABASE_URL` trong `backend/.env` (xem `.env.example`). File `test/setup-e2e.ts`
gán nó vào `DATABASE_URL` trước khi app khởi động, và **từ chối chạy** nếu tên database
không kết thúc bằng `_test`.

```powershell
docker compose up -d          # cần container postgres-test (cổng 5433)
cd backend
npm run test:e2e
```

**Không bao giờ chạy integration test trên database dev.** Test sẽ xóa dữ liệu, và bạn sẽ
mất từ vựng thật đã nhập.

### Dọn dữ liệu giữa các test

Trước mỗi test, `TRUNCATE` các bảng theo **đúng thứ tự phụ thuộc** (con trước, cha sau),
hoặc dùng `TRUNCATE ... RESTART IDENTITY CASCADE`.

Mỗi test tự dựng dữ liệu của mình. **Test phải chạy được theo bất kỳ thứ tự nào** — nếu
test B chỉ pass khi chạy sau test A, đó là bug trong test.

---

## 4. Trường hợp bắt buộc phải có

Danh sách đầy đủ ở skill `project-testing`. Các nhóm không được bỏ sót:

### Mọi module CRUD
Tạo thành công · thiếu field bắt buộc → 400 · gửi field lạ → 400 · id không tồn tại → 404
(**không phải 500**) · cập nhật một phần · xóa → 204

### Cách ly `ownerId` — quan trọng nhất về lâu dài
Tạo dữ liệu với owner A, truy vấn bằng owner B → **không thấy**.

Test này hiện tại luôn pass một cách tầm thường (chỉ có một owner). Giá trị của nó nằm ở
Phase 12: nếu ai đó quên `ownerId` trong một truy vấn, test này sẽ đỏ **ngay lập tức**
thay vì để lỗ hổng IDOR lọt ra production.

### Endpoint danh sách
`page=2` trả đúng tập · `total` đúng · `limit > 100` → 400 · `page ≤ 0` → 400 ·
trang vượt quá → `items: []` không lỗi · filter kết hợp · `sort` ngoài whitelist → 400

### Vocabulary — quan hệ N-N
Thêm một từ vào 2 collection · xóa 1 collection → từ vẫn còn ở collection kia ·
xóa từ → dòng bảng nối biến mất · cập nhật danh sách collection (transaction) ·
từ trùng → 201 kèm `warnings`, **không** phải 409

### Unicode — luôn có ít nhất một test dùng dữ liệu thật
`食べる` · `你好` · `안녕하세요` · tiếng Việt có dấu

Ký tự CJK và dấu tiếng Việt là nơi lỗi encoding lộ ra. Test bằng `"test"` và `"foo"` sẽ
không bao giờ phát hiện — và app này **chỉ** chứa dữ liệu như vậy.

### Learning — từ Phase 9
Trả lời đúng → `correctCount` +1 · trả lời sai → `incorrectCount` +1 ·
review lần đầu tạo mới `LearningProgress` · chuyển trạng thái
`NEW → LEARNING → REVIEW → MASTERED` đúng điều kiện

### Spaced Repetition — Phase 11
**Phủ mọi nhánh của thuật toán. Không có ngoại lệ.** Đây là logic tính toán thuần túy —
loại code dễ test nhất và cũng dễ sai nhất một cách âm thầm. Một lỗi ở đây không làm app
crash; nó chỉ khiến bạn ôn sai lịch trong nhiều tháng mà không biết.

---

## 5. Mức độ phủ mong muốn

| Vùng | Yêu cầu |
|---|---|
| `*.service.ts` | Mọi method public có ≥ 1 happy path + ≥ 1 nhánh lỗi |
| Endpoint API | Mọi endpoint có ≥ 1 integration test |
| Logic tính toán (SRS) | Phủ **mọi** nhánh |
| Controller, module, DTO | Không cần unit test riêng — đã được phủ bởi integration test |
| Component chỉ hiển thị | Không test |

---

## 6. Lệnh

```powershell
cd backend;  npm run test              # unit
cd backend;  npm run test:watch        # vừa code vừa chạy
cd backend;  npm run test:e2e          # integration (cần postgres-test)
cd backend;  npm run test:cov          # coverage
cd frontend; npm run test
```

---

## 7. Test được thêm ở phase nào

| Phase | Test được thêm |
|---|---|
| 1 | Smoke test: `GET /health` trả 200, kết nối được DB |
| 2 | Bộ test đầy đủ đầu tiên cho `languages` — **đây là bộ mẫu cho mọi module sau** |
| 3 | `levels`, `collections` — áp cùng pattern |
| 4 | `vocabulary` + test quan hệ N-N + pagination/search/filter |
| 5-6 | Component test cho form thêm từ (giữ context sau khi save) |
| 7-8 | Test logic sinh câu hỏi quiz và chọn đáp án nhiễu |
| 9 | Test cập nhật `LearningProgress` và ghi `ReviewLog` |
| 10 | Test tính toán thống kê Dashboard (chú ý múi giờ) |
| 11 | **Test thuật toán SRS — phủ mọi nhánh** |
| 12 | Test auth + **chạy lại toàn bộ test cách ly `ownerId`** trên codebase |

**Phase 2 đặc biệt quan trọng.** Bộ test của module `languages` sẽ được dùng làm khuôn mẫu
cho mọi module sau. Đầu tư thời gian làm nó tử tế sẽ được hoàn lại nhiều lần.
