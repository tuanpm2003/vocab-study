# infra/ — Hạ tầng production

```
infra/
├── terraform/   Lightsail, static IP, firewall, S3 backup, IAM user backup, AWS Budgets
└── server/      Những gì chạy TRÊN máy: Compose, Caddyfile, backup.sh, .env.example
```

Vì sao kiến trúc này: [docs/AWS_PLAN.md](../docs/AWS_PLAN.md) · ADR-014.
Pipeline deploy: [docs/GIT_FLOW.md](../docs/GIT_FLOW.md).

Lệnh bên dưới viết cho PowerShell.

---

## 1. Chạy thử stack production ở máy dev (không cần AWS)

```powershell
cd infra/server
Copy-Item .env.example .env.local
# Sửa .env.local: SITE_ADDRESS=http://localhost, APP_ORIGIN=http://localhost,
# IMAGE_PREFIX=vocab-local, REGISTRATION_ENABLED=true, điền POSTGRES_PASSWORD và JWT_SECRET.

$c = "-p", "vocab-prodtest", "-f", "docker-compose.yml", "-f", "docker-compose.local.yml", "--env-file", ".env.local"
docker compose @c --profile tools build
docker compose @c run --rm migrate
docker compose @c up -d
```

Mở `http://localhost`. Dọn dẹp: `docker compose @c --profile tools down -v`.

Cổng 80 phải trống. Stack này dùng project name riêng (`vocab-prodtest`) nên không đụng tới
database dev.

## 2. Dựng hạ tầng lần đầu

**Trước tiên, bằng tay trên AWS Console:** bật MFA cho tài khoản root, tạo một IAM user để
làm việc hằng ngày, tạo access key cho user đó và chạy `aws configure`.

```powershell
# Khóa SSH riêng cho GitHub Actions
ssh-keygen -t ed25519 -f "$HOME\.ssh\vocab_deploy" -N '""' -C github-actions

cd infra/terraform
Copy-Item terraform.tfvars.example terraform.tfvars   # rồi điền giá trị thật
terraform init
terraform plan      # ĐỌC kết quả: phải là 12 tài nguyên được tạo, 0 bị xóa
terraform apply
terraform output
```

AWS gửi email xác nhận budget tới `alert_email`.

Máy cần vài phút sau khi tạo để cài Docker. Kiểm tra:

```powershell
ssh ubuntu@<static_ip> "docker compose version; swapon --show"
```

### Điều cần biết về state

- `terraform.tfstate` nằm ở máy bạn và **chứa access key của IAM user backup**. File đã
  gitignore. Sao lưu nó ở nơi riêng tư (ví dụ trình quản lý mật khẩu).
- Mất state thì Terraform không còn biết tài nguyên nào là của nó; phải `terraform import`
  từng cái.
- Instance có `prevent_destroy`: `terraform destroy` sẽ bị từ chối. Database nằm trên đĩa
  của máy đó.

## 3. Cấu hình server và deploy lần đầu

1. Trỏ bản ghi **A** của tên miền về `static_ip`. Chờ `nslookup <tên miền>` trả đúng IP —
   Caddy không xin được chứng chỉ khi DNS chưa trỏ về.
2. Tạo file môi trường trên server:

   ```powershell
   scp infra/server/.env.example ubuntu@<static_ip>:/opt/vocab/.env
   ssh ubuntu@<static_ip>
   ```
   ```bash
   chmod 600 /opt/vocab/.env
   nano /opt/vocab/.env      # điền theo chú thích trong file
   ```
   Giá trị backup lấy từ `terraform output` và
   `terraform output -raw backup_secret_access_key`.
3. Đặt secret và variable trên GitHub theo [GIT_FLOW.md §5](../docs/GIT_FLOW.md), đặt
   `DEPLOY_ENABLED=true`.
4. Merge một PR vào `main` (hoặc Actions → Deploy → Run workflow).
5. Mở `https://<tên miền>/api/health`.

## 4. Đưa dữ liệu đang có lên production

Trên server thật, cơ chế "tài khoản đầu tiên nhận dữ liệu cũ" bị tắt (ADR-013). **Tạo tài
khoản ở máy local trước**, rồi mới chuyển database:

```powershell
docker exec vocab-postgres pg_dump -U vocab -d vocab_dev -Fc -f /tmp/dev.dump
docker cp vocab-postgres:/tmp/dev.dump dev.dump
scp dev.dump ubuntu@<static_ip>:/tmp/dev.dump
```
```bash
cd /opt/vocab && set -a && . ./.env && set +a
docker compose stop backend
docker compose exec -T postgres pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  --clean --if-exists --no-owner < /tmp/dev.dump
docker compose start backend
rm /tmp/dev.dump
```

`--clean` xóa bảng đang có trên production trước khi nạp. Chỉ làm bước này khi production
chưa có dữ liệu thật.

Sau đó kiểm tra `REGISTRATION_ENABLED=false` trong `/opt/vocab/.env`.

## 5. Backup và khôi phục

Cron trên server chạy `/opt/vocab/backup.sh` lúc 02:00 giờ Việt Nam: `pg_dump` → S3, thư mục
`daily/`. S3 tự xóa bản cũ hơn 30 ngày. Nhật ký: `/opt/vocab/backup.log`.

Chạy thử ngay, không chờ tới đêm:

```bash
/opt/vocab/backup.sh
```

**Thử khôi phục** (bắt buộc một lần — task F14-12). Server không đọc được bucket, nên tải về
bằng tài khoản của bạn ở máy dev:

```powershell
aws s3 ls s3://<backup_bucket>/daily/
aws s3 cp s3://<backup_bucket>/daily/<tên file> restore.dump

docker run -d --name vocab-restore -e POSTGRES_PASSWORD=restore_only postgres:16-alpine
docker cp restore.dump vocab-restore:/tmp/restore.dump
docker exec vocab-restore pg_restore -U postgres -d postgres --no-owner /tmp/restore.dump
docker exec vocab-restore psql -U postgres -c 'SELECT count(*) FROM "Vocabulary"'
docker rm -f vocab-restore
```

So số dòng với production.

## 6. Việc hay làm trên server

```bash
cd /opt/vocab
docker compose ps
docker compose logs -f --tail 100 backend
docker compose restart backend
df -h /            # đĩa
free -m            # RAM và swap
```

Không sửa `docker-compose.yml`, `Caddyfile`, `backup.sh` trên server: lần deploy kế tiếp sẽ
ghi đè. Sửa trong repo.

## 7. Thêm một proxy phía trước thì phải sửa gì

Backend đang tin đúng **một** proxy (`TRUST_PROXY_HOPS: 1` trong `docker-compose.yml`). Nếu
sau này đặt CloudFront hay một proxy khác trước Caddy, tăng giá trị này lên 2. Để nguyên thì
mọi người dùng bị tính chung một IP và chung một bộ đếm rate-limit.
