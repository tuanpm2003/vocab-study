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
| Monorepo tooling (Turborepo / workspaces) | Solo dev, chỉ 2 app | Khi cần chia sẻ nhiều code giữa FE và BE |
| API versioning (`/v1/`) | Không có client ngoài tầm kiểm soát | Phase 13, nếu app thành công khai |
| E2E test (Playwright) | Chậm, hay vỡ vặt; G5 đã thay thế phần lớn | Sau MVP |
| Typing mode | Ngoài MVP theo yêu cầu | Sau Phase 11 |
| Dark mode, PWA | Ngoài MVP | Sau MVP |
| `helmet` | Security header đã đặt ở Caddy (2026-10-08) | Khi backend được gọi trực tiếp, không qua Caddy |
| Redis / cache | Chưa có vấn đề hiệu năng nào | Khi đo được nút thắt thật |

---

## TRƯỚC KHI LÊN MẠNG — chặn Phase 13

Danh sách này do Quality Gate G4 sinh ra và bổ sung dần. **Phải xong hết trước khi app
có URL công khai.** Chi tiết ở skill `security-checklist`.

- [x] Authentication thật (Phase 12, ADR-013) — xong 2026-10-07
- [x] `ownerId` trở thành khóa ngoại thật tới bảng `User` — xong 2026-10-07
- [x] HTTP security header — đặt ở Caddy (`infra/server/Caddyfile`) thay vì `helmet`: phủ được cả trang của Next.js, không thêm dependency. Xong 2026-10-08
- [x] Rate limiting cho **toàn bộ** API theo IP thật (`API_RATE_LIMIT_PER_MINUTE`, `TRUST_PROXY_HOPS`) — xong 2026-10-08
- [ ] HTTPS bắt buộc + HSTS — cookie phiên chỉ có cờ `secure` khi `NODE_ENV=production`
- [ ] **Tạo tài khoản của mình TRƯỚC khi app có URL công khai**, rồi đặt `REGISTRATION_ENABLED=false`: nếu dòng giữ chỗ dữ liệu cũ chưa được nhận, người lạ đầu tiên đăng ký sẽ lấy toàn bộ dữ liệu
- [ ] `JWT_SECRET` thật, lưu ở Secrets Manager; `NODE_ENV=production` phải được đặt (nếu không, backend chạy với khóa tạm và cookie không `secure`)
- [ ] Quên mật khẩu / đổi mật khẩu / xác minh email; thu hồi phiên (refresh token hoặc bảng Session)
- [ ] Chống dò mật khẩu **theo tài khoản**, không chỉ theo IP: 10 lần/phút/IP vẫn là 14.400 lần đoán mỗi ngày. Thêm giới hạn theo email (ví dụ 5 lần sai / 15 phút, tăng dần) và bộ đếm dùng chung giữa các instance (hiện nằm trong RAM)
- [x] `trust proxy` đúng số hop (1 = Caddy, đặt trong `infra/server/docker-compose.yml`; thêm CloudFront thì phải tăng lên 2) — xong 2026-10-08. Lý do: chưa đặt thì mọi request cùng một IP (một người khóa đăng nhập của tất cả); đặt bừa thì giả `X-Forwarded-For` là né được
- [ ] Đổi tên cookie thành `__Host-access_token` để subdomain khác không ghi đè được
- [ ] Đặt lại mật khẩu bằng một lệnh CLI thay cho cách sửa tay trong Prisma Studio (README → "Quên mật khẩu")
- [ ] Mật khẩu DB mạnh, lưu ở Secrets Manager
- [x] Database không tới được từ internet — theo ADR-014 không dùng RDS: Postgres chạy trong Compose, không publish cổng; firewall Lightsail chỉ mở 80/443/22. Xong 2026-10-08 (cấu hình), kiểm lại trên server thật ở F14-08
- [ ] CORS giới hạn đúng domain production
- [ ] `HOST=0.0.0.0` chỉ đặt bên trong container phía sau load balancer — mặc định `127.0.0.1` (Phase 1)
- [ ] Log không ghi thông tin nhạy cảm — cụ thể: `AllExceptionsFilter` ghi `exception.stack` cho lỗi 500, và lỗi validation của Prisma có thể chứa dữ liệu người dùng
- [x] Tắt Swagger ở production — xong 2026-10-08
- [ ] Kiểm tra header `Host` (chống DNS rebinding) — hoặc để authentication giải quyết
- [ ] 8 lệnh ghi "an toàn gián tiếp" (kiểm tra owner ở bước trước, không nằm trong chính câu lệnh ghi — bảng A của báo cáo G4 2026-10-06) phải xem lại nếu thêm tính năng chuyển/chia sẻ dữ liệu giữa người dùng
- [ ] Nâng Next.js lên bản đã vá (từ 16.3.8): bản 16.3.6 có advisory; rà soát G4 2026-10-08 không thấy cái nào khai thác được với cấu hình hiện tại, nhưng nên nâng trước khi công khai
- [ ] Role Postgres riêng cho app thay vì superuser `POSTGRES_USER` (phòng thủ tầng sâu, G4 2026-10-08)
- [ ] CSP đầy đủ (`script-src` với nonce) cho Next.js — hiện chỉ có `frame-ancestors`, `base-uri`, `form-action`, `object-src`
- [ ] Chỉ dùng bản ghi DNS loại A cho tên miền. Thêm AAAA (IPv6) có thể khiến mọi người dùng IPv6 bị tính chung một IP trong rate-limit — chưa kiểm trên máy thật
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
