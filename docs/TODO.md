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
| `npm install` ở `backend/` báo 4 lỗ hổng mức high (`npm audit`), frontend 0 | Phase 1 (F0-13) | G4 của `/phase-verify` Phase 1 đánh giá; không chạy `npm audit fix --force` mù
| Trang `/` hiện là walking skeleton (kiểm tra `/health`) | Phase 1 | F10-04 thay bằng Dashboard; có thể giữ khối health ở góc trang |

---

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
- [ ] Log không ghi thông tin nhạy cảm
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
