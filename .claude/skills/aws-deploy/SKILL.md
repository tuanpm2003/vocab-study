---
name: aws-deploy
description: So sánh các kiến trúc AWS cho dự án kèm ước tính chi phí, và checklist deploy. Dùng ở Phase 13 khi bàn về deploy, hoặc bất cứ lúc nào cần cân nhắc quyết định hạ tầng sẽ ảnh hưởng tới code hiện tại.
---

# AWS Deployment — Phase 13

> **Trạng thái: chưa triển khai.** Skill này tồn tại để (a) trả lời câu hỏi về chi phí và
> kiến trúc khi chúng phát sinh trong lúc code, và (b) bảo đảm các quyết định hôm nay
> không khóa chúng ta vào một lựa chọn hạ tầng. **Không bắt đầu deploy trước khi MVP chạy
> ổn định ở local.**

## Nguyên tắc

Chi phí + sự đơn giản + learning value được ưu tiên hơn "kiến trúc trông chuyên nghiệp".
Không dùng một dịch vụ AWS nào chỉ vì nó có trong sơ đồ tham khảo trên mạng.

## Điều kiện cần trước khi deploy

- [ ] MVP chạy ổn định ở local ít nhất 2 tuần sử dụng thật
- [ ] Có test integration cho mọi endpoint
- [ ] `docs/API.md` và `docs/DATABASE.md` khớp với code
- [ ] Đã qua Quality Gate G4 với mục "TRƯỚC KHI LÊN MẠNG" trong `security-checklist` được
      xử lý hết
- [ ] Authentication thật đã xong (Phase 12) — **không deploy app không có auth ra internet**

## Ba kiến trúc — so sánh

### A. Toàn AWS

```
Next.js (static export) → S3 + CloudFront
NestJS (Docker)         → ECS Fargate + ALB
PostgreSQL              → RDS db.t4g.micro
```

| | |
|---|---|
| Chi phí/tháng | ~45-60 USD (RDS ~15, Fargate ~12, ALB ~18, CloudFront/S3 ~2) |
| Độ phức tạp | Cao — VPC, subnet, security group, task definition, ALB target group |
| Learning value | **Cao nhất** — đây là kiến trúc production thật |
| Bảo trì | Trung bình |

**ALB là khoản đắt bất ngờ**: ~18 USD/tháng chỉ để tồn tại, kể cả khi không có traffic.
Với app một người dùng, đó là khoản chi khó biện minh nhất.

### B. Vercel + AWS

```
Next.js     → Vercel (free tier)
NestJS      → ECS Fargate hoặc App Runner
PostgreSQL  → RDS
```

| | |
|---|---|
| Chi phí/tháng | ~30-45 USD |
| Độ phức tạp | Thấp cho frontend, vẫn cao cho backend |
| Learning value | Trung bình — bỏ qua phần S3/CloudFront |
| Bảo trì | Thấp |

Đánh đổi: deploy frontend trở nên trivial, nhưng bạn không học được CloudFront và
không còn "toàn bộ hạ tầng ở một chỗ".

### C. Tối giản chi phí (đề xuất cân nhắc nghiêm túc)

```
Next.js     → S3 + CloudFront          (~2 USD)
NestJS      → AWS App Runner            (~15 USD, không cần ALB, tự có HTTPS)
PostgreSQL  → Neon / Supabase free tier (0 USD) hoặc RDS (~15 USD)
```

| | |
|---|---|
| Chi phí/tháng | **~17 USD**, hoặc ~2 USD nếu backend scale về 0 khi không dùng |
| Độ phức tạp | Thấp — App Runner nhận Docker image và tự lo scaling, HTTPS, health check |
| Learning value | Trung bình-cao — vẫn học Docker, CloudFront, IAM, Secrets Manager |
| Bảo trì | Thấp nhất |

App Runner về bản chất là "Fargate + ALB gói sẵn" — bạn mất quyền kiểm soát chi tiết
nhưng tiết kiệm được khoản ALB và phần lớn công cấu hình VPC.

## Khuyến nghị sơ bộ

Nếu mục tiêu chính là **học AWS** → A. Nếu mục tiêu chính là **có app dùng được với chi
phí hợp lý** → C. Quyết định cuối cùng ở Phase 13, sau khi biết app thật sự được dùng
nhiều hay ít.

Điều quan trọng: **quyết định này không ảnh hưởng tới code đang viết.** Vì ta dùng
PostgreSQL chuẩn + Docker + Next static export, app chạy được ở cả ba kiến trúc mà không
cần sửa dòng nào.

## Những gì bắt buộc dù chọn kiến trúc nào

- **Secrets Manager** (hoặc Parameter Store) cho mật khẩu database. Không đặt trong
  task definition dạng plain text.
- **RDS trong private subnet.** Không bao giờ để database có public IP.
- **CloudWatch Logs** cho container, giữ log 7-14 ngày (log giữ vĩnh viễn tốn tiền).
- **Billing Alarm** — đặt cảnh báo ở mức 2× chi phí dự kiến. Đây là việc đầu tiên phải
  làm trên một tài khoản AWS mới, trước cả khi tạo tài nguyên nào.
- **Backup tự động cho RDS**, và **thử khôi phục một lần** để biết chắc nó hoạt động.
  Backup chưa từng được thử khôi phục thì không phải backup.
- **`npx prisma migrate deploy`** chạy như một bước riêng khi deploy, không phải
  `migrate dev` và không chạy tự động lúc app khởi động (nhiều container khởi động cùng
  lúc sẽ chạy migration đồng thời và gây xung đột).

## Chuẩn bị từ bây giờ — chi phí bằng 0

Những thứ này làm ở Phase 1-12 sẽ khiến Phase 13 dễ hơn nhiều:

- [ ] Mọi cấu hình đọc từ biến môi trường, không hard-code
- [ ] `Dockerfile` cho backend viết theo multi-stage build
- [ ] Có endpoint `GET /health` trả 200 (health check của ALB/App Runner cần nó)
- [ ] Backend lắng nghe trên `process.env.PORT`, không hard-code 4000
- [ ] Frontend không dùng tính năng nào của Next.js cần server runtime
      (kiểm tra bằng cách chạy thử `next build` với `output: 'export'`)
- [ ] Log ra `stdout` dạng JSON, không ghi ra file
