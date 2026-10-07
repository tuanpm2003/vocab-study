# TODO

> **Task để tới MVP nằm ở [PLAN.md](PLAN.md), không nằm ở đây.**
> File này chỉ chứa: nợ kỹ thuật, việc hoãn có chủ đích, và việc phải làm trước khi lên mạng.
>
> Mọi mục phải ghi rõ **phase nào sẽ xử lý**. TODO không có thời điểm là TODO chết.
> Mục mới được thêm vào đây từ kết quả Quality Gate (phần "ghi vào TODO, chưa làm bây giờ").

Ký hiệu: ⬜ chưa làm · 🔄 đang làm · ✅ xong · ⏸️ hoãn có chủ đích

---

## Nợ kỹ thuật đã nhận diện

| Mục | Phát hiện | Xử lý khi |
|---|---|---|
| ESLint 9 đã hết hỗ trợ (`npm warn deprecated eslint@9`), nhưng `eslint-config-next@16` vẫn ghim `^9` | Phase 1 | Khi `eslint-config-next` hỗ trợ ESLint 10 — nâng cả hai cùng lúc |
| Backend dùng nháy đơn, frontend dùng nháy kép (mỗi bên theo mặc định của framework) | Phase 1 | Chỉ đồng bộ nếu gây khó chịu thật; không ảnh hưởng hành vi |
| Prisma CLI `latest` trỏ tới `8.0.0-rc` — đang ghim `7.10.0` (ADR-009) | Phase 1 | Khi Prisma 8 ổn định — nâng CLI và client cùng lúc, có kế hoạch riêng |
| `npm audit --omit=dev` ở `backend/`: 4 high, đều nằm trong **Prisma CLI** (`deepmerge-ts`, `mysql2`) — chỉ chạy lúc `migrate`/`generate`, app dùng PostgreSQL nên không có đường khai thác. `npm audit fix` đề xuất hạ Prisma về 6 (breaking) — **không chạy** | G4 2026-10-06 | Khi Prisma 7.x có bản vá, cùng lúc với mục Prisma ở trên |
| `npm audit --omit=dev` ở `frontend/`: 2 high ở `source-map-js` (công cụ build, không nhận input người dùng). Critical của `next` 16.3.5 (RCE `next/og`, app không dùng) đã hết sau khi nâng 16.3.6 | G4 2026-10-06 | Theo các bản vá tiếp theo của Next |
| `enableImplicitConversion` ép kiểu ngầm ở **body**: `{"name": 123}` lưu thành `"123"`, `{"name": {}}` thành `"[object Object]"`. Boolean đã xử lý bằng `rawValue`; chuỗi và số thì chưa. Không vượt quyền, chỉ là dữ liệu rác từ client lỗi | G4 2026-10-06 | Phase 12 — bỏ implicit conversion toàn cục (query DTO đã có `@Type`) |
| Field id (`languageId`, `collectionIds[]`, tham số `:id`…) chưa có `@MaxLength`; id dài bị lặp lại trong thông điệp 404 | G4 2026-10-06 | Phase 12 |
| Form từ vựng và cây bài học chỉ tải 100 collection đầu của một ngôn ngữ. Đã chặn việc âm thầm gỡ bài học nằm ngoài 100, nhưng các bài đó không hiện để chọn | G3 2026-10-06 | Khi một ngôn ngữ thật sự vượt 100 bài học — thêm ô tìm bài học |
| `GET /languages/:id` và `GET /languages/:id/level-systems` không phân trang; số level thêm lẻ vào một hệ thống không có trần | G4 2026-10-06 | Phase 12 (nhiều người dùng) |

---

> **SRS (Phase 11):** chưa có giới hạn số từ mới mỗi ngày — thêm 200 từ thì cả 200 nằm trong
> "Ôn tập". Học trước hạn (qua "Học") vẫn đẩy lịch xa thêm như ôn đúng hạn. Xem lại khi số từ
> đến hạn mỗi ngày vượt sức ôn (ADR-012 → "Khi nào nên xem lại").

## Hoãn có chủ đích ⏸️

Những thứ **cố ý không làm**, kèm điều kiện để xem lại:

| Mục | Lý do hoãn | Xem lại khi |
|---|---|---|
| Bảng `Tag` | `Collection` đã làm được việc của tag | Dùng app vài tháng vẫn thấy thiếu |
| Bảng `User` | MVP một người dùng | Phase 12 |
| Monorepo tooling (Turborepo / workspaces) | Solo dev, chỉ 2 app | Khi cần chia sẻ nhiều code giữa FE và BE |
| API versioning (`/v1/`) | Không có client ngoài tầm kiểm soát | Phase 13, nếu app thành công khai |
| E2E test (Playwright) | Chậm, hay vỡ vặt; G5 đã thay thế phần lớn | Sau MVP |
| Typing mode | Ngoài MVP theo yêu cầu | Sau Phase 11 |
| Dark mode, PWA | Ngoài MVP | Sau MVP |
| `helmet`, rate limiting | App chạy localhost | **Bắt buộc trước Phase 13** |
| Redis / cache | Chưa có vấn đề hiệu năng nào | Khi đo được nút thắt thật |

---

## TRƯỚC KHI LÊN MẠNG — chặn Phase 13

Danh sách này do Quality Gate G4 sinh ra và bổ sung dần. **Phải xong hết trước khi app
có URL công khai.** Chi tiết ở skill `security-checklist`.

- [ ] Authentication thật (Phase 12) — **không deploy app không có auth ra internet**
- [ ] `ownerId` trở thành khóa ngoại thật tới bảng `User`
- [ ] `helmet` + HTTP security header
- [ ] Rate limiting (`@nestjs/throttler`)
- [ ] HTTPS bắt buộc + HSTS
- [ ] Mật khẩu DB mạnh, lưu ở Secrets Manager
- [ ] RDS trong private subnet, Security Group chỉ cho phép ECS task
- [ ] CORS giới hạn đúng domain production
- [ ] `HOST=0.0.0.0` chỉ đặt bên trong container phía sau load balancer — mặc định `127.0.0.1` (Phase 1)
- [ ] Log không ghi thông tin nhạy cảm — cụ thể: `AllExceptionsFilter` ghi `exception.stack` cho lỗi 500, và lỗi validation của Prisma có thể chứa dữ liệu người dùng
- [ ] Tắt hoặc bảo vệ Swagger `/api` ở production (hiện luôn bật trong `main.ts`)
- [ ] Kiểm tra header `Host` (chống DNS rebinding) — hoặc để authentication giải quyết
- [ ] 8 lệnh ghi "an toàn gián tiếp" (kiểm tra owner ở bước trước, không nằm trong chính câu lệnh ghi — bảng A của báo cáo G4 2026-10-06) phải xem lại nếu thêm tính năng chuyển/chia sẻ dữ liệu giữa người dùng
- [ ] Backup tự động + **đã thử khôi phục một lần**
- [ ] CloudWatch alarm cho lỗi 5xx **và cho chi phí**
- [ ] Billing Alarm đặt ngay khi tạo tài khoản AWS, trước cả khi tạo tài nguyên đầu tiên

---

## Ý tưởng — chưa cam kết

Không phải TODO. Chỉ là chỗ ghi lại để khỏi quên.

- Nút "phát âm" dùng Web Speech API của trình duyệt (miễn phí) trước khi cân nhắc
  Amazon Polly (tốn tiền)
- Phím tắt toàn cục: `n` = từ mới, `s` = bắt đầu học, `/` = tìm kiếm
- Xuất một collection ra file CSV để in làm flashcard giấy
- Thống kê "từ hay sai nhất" — dữ liệu đã có sẵn trong `ReviewLog` từ Phase 9
