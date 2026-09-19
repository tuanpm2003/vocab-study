---
name: security-checklist
description: Danh sách kiểm tra bảo mật cho dự án — cách ly ownerId (IDOR), validate input, mass assignment, secret lộ trong code, CORS, injection, và những gì phải xử lý trước khi deploy lên internet. Dùng khi rà soát bảo mật hoặc trước khi lên AWS.
---

# Checklist bảo mật

## Mô hình đe dọa hiện tại

MVP chạy **local, một người dùng, không expose ra internet**. Nhiều rủi ro kinh điển
(brute force, DDoS, CSRF) **chưa áp dụng được**. Đừng báo cáo chúng như vấn đề hiện tại.

Chia mọi phát hiện thành hai nhóm:
- **BÂY GIỜ** — rủi ro thật ở MVP local.
- **TRƯỚC KHI LÊN MẠNG** — ghi vào `docs/TODO.md`, xử lý ở Phase 12/13.

## 1. Cách ly `ownerId` — rủi ro số 1 của dự án này

Dự án cố ý hoãn bảng `User` nhưng vẫn mang `ownerId` xuyên suốt code. Nếu **một** truy vấn
Prisma quên `ownerId`, thì ở Phase 12 khi có nhiều người dùng thật, đó là lỗ hổng **IDOR**
(Insecure Direct Object Reference): người dùng A đọc/sửa/xóa dữ liệu của người dùng B.

Bây giờ nó **không có triệu chứng nào** vì chỉ có một owner. Đúng vì vậy mà nó dễ lọt.

```bash
grep -rn "prisma\.\w*\.\(findMany\|findFirst\|findUnique\|update\|updateMany\|delete\|deleteMany\|count\|aggregate\|groupBy\)" backend/src
```

Với **từng** kết quả, xác nhận:
- [ ] `where` có `ownerId`?
- [ ] Nếu là `findUnique({ id })` → có kiểm tra `ownerId` ngay sau đó không?
      (tốt hơn: đổi sang `findFirst({ where: { id, ownerId } })`)
- [ ] `update` / `delete` theo id có kiểm tra quyền sở hữu **trước** khi thực hiện không?
      Mẫu an toàn: `updateMany({ where: { id, ownerId } })` — nếu không khớp owner thì
      `count = 0` và bạn ném 404, thay vì sửa nhầm dữ liệu người khác.

Báo cáo phải ghi rõ: *"đã đối chiếu N/N lời gọi Prisma"*.

## 2. Validate input

- [ ] Mọi endpoint nhận body có DTO + `class-validator`?
- [ ] `ValidationPipe` có `whitelist: true` **và** `forbidNonWhitelisted: true`?
      Thiếu → **mass assignment**: client gửi `{"ownerId": "..."}` và nó chui vào DB.
- [ ] `page` / `limit` có `@Min` / `@Max`? (`limit=999999` = tự DoS chính mình)
- [ ] `sort` có whitelist danh sách cột cho phép không?
- [ ] Field `extra` (JSON) có giới hạn kích thước không?
- [ ] Có giới hạn độ dài cho mọi field chuỗi không? (`@MaxLength`)
- [ ] Body request có giới hạn kích thước tổng không? (`app.use(json({ limit: '1mb' }))`)

## 3. Injection

- [ ] Có `$queryRawUnsafe` không? → phải đổi sang `$queryRaw` dạng tagged template.
- [ ] `$queryRaw` có nối chuỗi bằng `+` hay `${}` với dữ liệu người dùng không?
      An toàn: `` prisma.$queryRaw`SELECT * FROM v WHERE term = ${term}` `` (Prisma tham số hóa)
      Nguy hiểm: `prisma.$queryRawUnsafe('SELECT * FROM v WHERE term = ' + term)`
- [ ] Có `eval`, `new Function()`, `child_process` với input người dùng không?
- [ ] Frontend có `dangerouslySetInnerHTML` không? (XSS — đặc biệt nguy hiểm với
      field `notes` và `meaning` do người dùng nhập)

## 4. Secret

```bash
grep -rniE "(password|secret|api[_-]?key|token|DATABASE_URL)\s*[:=]\s*['\"][^'\"]{6,}" backend/src frontend/src
```

- [ ] Không có secret trong source?
- [ ] `.env` nằm trong `.gitignore`?
- [ ] Đã kiểm tra **lịch sử git** chưa? (`git log -p -- .env`) — secret đã commit thì
      xóa file không đủ, nó vẫn nằm trong lịch sử.
- [ ] Có `.env.example` với giá trị giả để người khác biết cần những biến gì?
- [ ] **Frontend**: không có secret nào mang prefix `NEXT_PUBLIC_`?
      Biến đó bị nhúng thẳng vào bundle JavaScript và ai mở DevTools cũng đọc được.

## 5. Cấu hình

- [ ] CORS có đang để `origin: '*'` không? Local phải là `http://localhost:3000`.
- [ ] Thông điệp lỗi trả ra ngoài có lộ stack trace, câu SQL, tên bảng, đường dẫn file không?
- [ ] `NODE_ENV=production` có tắt chi tiết lỗi không?
- [ ] Docker compose có expose PostgreSQL ra `0.0.0.0` không? Nên bind `127.0.0.1:5432:5432`.
- [ ] Mật khẩu PostgreSQL trong `docker-compose.yml` có phải giá trị mặc định
      (`postgres`/`postgres`) không? Ở local chấp nhận được, nhưng phải khác ở Phase 13.

## 6. Phụ thuộc

```powershell
cd backend;  npm audit --omit=dev
cd frontend; npm audit --omit=dev
```

Chỉ báo cáo lỗ hổng **high/critical** có đường khai thác thực tế trong app này.
**Không dán nguyên output `npm audit`** — phần lớn là lỗ hổng trong dev dependency
không bao giờ chạy ở production.

## TRƯỚC KHI LÊN MẠNG — danh sách cho Phase 12/13

Chưa làm bây giờ, nhưng phải xong trước khi có URL công khai:

- [ ] Authentication thật (JWT hoặc Cognito) thay cho `LOCAL_OWNER_ID`
- [ ] `ownerId` trở thành khóa ngoại thật tới bảng `User`
- [ ] `helmet` cho HTTP security header
- [ ] Rate limiting (`@nestjs/throttler`) — ít nhất cho endpoint đăng nhập
- [ ] HTTPS bắt buộc, HSTS
- [ ] Mật khẩu database mạnh, lưu ở Secrets Manager, không ở biến môi trường plain text
- [ ] RDS nằm trong private subnet, không expose ra internet
- [ ] Security Group chỉ cho ECS task kết nối tới RDS
- [ ] CORS giới hạn đúng domain production
- [ ] Log không ghi thông tin nhạy cảm
- [ ] Backup database tự động + đã **thử khôi phục** một lần
- [ ] CloudWatch alarm cho lỗi 5xx và cho chi phí

## Mức độ

| Mức | Tiêu chí |
|---|---|
| **CAO** | Rò rỉ/mất dữ liệu, thực thi code, chiếm quyền |
| **TRUNG BÌNH** | Thiếu phòng thủ tầng sâu, cấu hình lỏng |
| **THẤP** | Làm cứng thêm, tùy chọn |

Nếu không phát hiện gì, nói thẳng. Đừng lấp đầy báo cáo bằng khuyến nghị chung chung
kiểu "nên cân nhắc thêm WAF" khi app đang chạy trên localhost.
