---
name: project-testing
description: Chiến lược test của dự án — test cái gì ở tầng nào, cách mock PrismaService, cách dựng database test, và danh sách trường hợp biên bắt buộc. Dùng khi viết test hoặc khi đánh giá độ phủ test của một phase.
---

# Chiến lược test

## Nguyên tắc: test hành vi, không test cách cài đặt

Test tốt mô tả **app làm gì**. Test tồi mô tả **code được viết thế nào** — nó vỡ mỗi lần
bạn refactor dù hành vi không đổi, và dần dần bạn sẽ ghét việc chạy test.

Cách kiểm tra: nếu bạn đổi tên một biến private trong service mà test fail, test đó viết sai.

## Test ở tầng nào

| Tầng | Ở đâu | Test gì | Mock gì |
|---|---|---|---|
| **Unit — Service** | `src/**/*.service.spec.ts` | Business logic, nhánh điều kiện, ném exception | Mock `PrismaService` |
| **Integration — API** | `test/*.e2e-spec.ts` | HTTP request → response, DTO validate, status code | Không mock — dùng DB test thật |
| **Component** | `src/**/*.test.tsx` | Form giữ state, flashcard lật mặt | Mock `apiFetch` |
| **E2E** | (sau MVP) | Flow đầy đủ qua trình duyệt | Không mock |

**Ưu tiên tuyệt đối cho Service unit test và API integration test.** Đó là nơi có logic
thật và là nơi bug gây hậu quả thật (sai dữ liệu). Component test chỉ viết cho component
**có logic**; component chỉ hiển thị thì test không đáng công sức.

## Mock PrismaService

Dự án dùng **Vitest** (mặc định của NestJS 12, xem ADR-009). `vi` là global — không cần import.
Import nội bộ phải có đuôi `.js` vì backend là ESM: `import { LanguagesService } from './languages.service.js'`.

```ts
const prismaMock = {
  language: {
    findMany:   vi.fn(),
    findFirst:  vi.fn(),
    create:     vi.fn(),
    update:     vi.fn(),
    delete:     vi.fn(),
  },
};

beforeEach(async () => {
  const module = await Test.createTestingModule({
    providers: [
      LanguagesService,
      { provide: PrismaService, useValue: prismaMock },
    ],
  }).compile();
  service = module.get(LanguagesService);
  vi.clearAllMocks();          // ← quên dòng này thì test ảnh hưởng lẫn nhau
});
```

Đây là lợi ích cụ thể của Dependency Injection: service nhận `PrismaService` qua constructor
nên bạn **thay được** nó bằng mock mà không sửa dòng code nào của service. Nếu service tự
`new PrismaClient()` bên trong, bạn không thể test nó tách biệt.

## Database cho integration test

Dùng một database **riêng**, không dùng chung với dev:

```yaml
# docker-compose.yml — service thứ hai
postgres-test:
  image: postgres:16-alpine
  ports: ["5433:5432"]
  environment: { POSTGRES_DB: vocab_test, ... }
```

```powershell
$env:DATABASE_URL = "postgresql://...@localhost:5433/vocab_test"
npx prisma migrate deploy
npm run test:e2e
```

Trước mỗi test, dọn sạch bảng theo **đúng thứ tự phụ thuộc** (con trước, cha sau), hoặc
dùng `TRUNCATE ... CASCADE`. Không dùng chung dữ liệu giữa các test — test phải chạy được
theo bất kỳ thứ tự nào.

## Trường hợp bắt buộc phải có test

Không được bỏ sót các nhóm này. Đây là danh sách kiểm tra khi review độ phủ:

**Cho mọi module CRUD**
- [ ] Tạo thành công → 201, dữ liệu đúng trong DB
- [ ] Tạo thiếu field bắt buộc → 400
- [ ] Tạo với field lạ không có trong DTO → 400 (kiểm chứng `forbidNonWhitelisted`)
- [ ] Lấy theo id không tồn tại → 404, **không phải 500**
- [ ] Cập nhật một phần → chỉ field được gửi thay đổi
- [ ] Xóa → 204, và bản ghi thật sự biến mất
- [ ] **Cách ly `ownerId`**: tạo dữ liệu với owner A, truy vấn bằng owner B → không thấy

**Cho endpoint danh sách**
- [ ] Phân trang: `page=2` trả đúng tập, `total` đúng
- [ ] `limit` vượt quá 100 → 400
- [ ] `page=0` hoặc âm → 400
- [ ] Trang vượt quá số trang → `items: []`, không lỗi
- [ ] Filter kết hợp nhiều điều kiện cùng lúc
- [ ] `sort` với field không nằm trong whitelist → 400

**Cho Vocabulary (quan hệ N-N)**
- [ ] Thêm một từ vào 2 collection cùng lúc
- [ ] Xóa 1 collection → từ vẫn còn ở collection kia
- [ ] Xóa từ → các dòng trong bảng nối cũng biến mất
- [ ] Cập nhật danh sách collection của một từ (xóa hết rồi thêm lại trong transaction)
- [ ] Từ trùng → trả 201 kèm `warnings`, **không** phải 409

**Unicode — luôn có ít nhất một test dùng dữ liệu thật**
- [ ] `食べる`, `你好`, `안녕하세요`, và tiếng Việt có dấu
- Ký tự CJK và dấu tiếng Việt là nơi lỗi encoding lộ ra. Nếu chỉ test bằng `"test"` và
  `"foo"` thì sẽ không bao giờ phát hiện.

**Cho Learning (từ Phase 9)**
- [ ] Trả lời đúng → `correctCount` +1, `reviewCount` +1
- [ ] Trả lời sai → `incorrectCount` +1
- [ ] Lần review đầu tiên tạo mới `LearningProgress` nếu chưa có
- [ ] Chuyển trạng thái `NEW` → `LEARNING` → `REVIEW` → `MASTERED` đúng điều kiện

## Mức độ phủ mong muốn

Không đặt mục tiêu phần trăm tổng thể — nó khuyến khích viết test vô nghĩa cho getter/setter.
Thay vào đó:

| Vùng | Yêu cầu |
|---|---|
| `*.service.ts` | Mọi method public có ít nhất happy path + một nhánh lỗi |
| Endpoint API | Mọi endpoint có ít nhất một integration test |
| Logic tính toán (SRS ở Phase 11) | Phủ mọi nhánh, bắt buộc |
| Controller, module, DTO | Không cần unit test riêng (đã được phủ bởi integration test) |

## Lệnh

```powershell
cd backend;  npm run test              # unit
cd backend;  npm run test:watch        # vừa code vừa chạy
cd backend;  npm run test:e2e          # integration
cd backend;  npm run test:cov          # coverage
cd frontend; npm run test
```

## Bẫy thường gặp

| Bẫy | Cách tránh |
|---|---|
| Test phụ thuộc thứ tự chạy | Mỗi test tự dựng dữ liệu của mình, dọn sạch DB trước mỗi test |
| Quên `vi.clearAllMocks()` | Đặt trong `beforeEach` |
| Test chỉ chạy happy path rồi tuyên bố "đã test" | Dùng checklist trường hợp biên ở trên |
| **Sửa code nguồn để test xanh** | Test fail nghĩa là có bug hoặc test sai — xác định rõ cái nào trước khi sửa |
| Mock quá sâu tới mức test không còn kiểm chứng gì | Nếu test chỉ xác nhận "mock đã được gọi", nó không có giá trị |
| Test dùng database dev | Dùng DB test riêng ở port 5433 |
