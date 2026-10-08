#!/usr/bin/env bash
# Dump PostgreSQL rồi đẩy lên S3. Cron gọi mỗi đêm (xem infra/terraform/user_data.sh.tftpl).
# Chạy tay để thử:  /opt/vocab/backup.sh
set -euo pipefail

cd /opt/vocab
set -a
# shellcheck disable=SC1091
. ./.env
set +a

# Bản dump chứa mọi thứ, kể cả hash mật khẩu: chỉ user này đọc được, tên file không đoán trước được.
umask 077
stamp="$(date -u +%Y-%m-%dT%H%M%SZ)"
file="$(mktemp /tmp/vocab-backup.XXXXXX)"
trap 'rm -f "$file"' EXIT

# -Fc: định dạng nén của pg_dump, khôi phục bằng pg_restore.
# Ghi ra file trước rồi mới upload: nếu pg_dump lỗi giữa chừng thì không có bản hỏng nào lên S3.
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc >"$file"

# `-e TÊN` không kèm giá trị: Docker lấy từ môi trường, secret không hiện trong `ps`.
export AWS_ACCESS_KEY_ID="$BACKUP_AWS_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$BACKUP_AWS_SECRET_ACCESS_KEY"
export AWS_DEFAULT_REGION="$BACKUP_AWS_REGION"
docker run --rm \
  -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_DEFAULT_REGION \
  -v "$file:/backup.dump:ro" \
  amazon/aws-cli s3 cp /backup.dump "s3://${BACKUP_BUCKET}/daily/vocab-${stamp}.dump" --only-show-errors

echo "backup ok: s3://${BACKUP_BUCKET}/daily/vocab-${stamp}.dump ($(du -h "$file" | cut -f1))"
