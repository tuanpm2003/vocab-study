data "aws_caller_identity" "current" {}

# Tên bucket phải duy nhất trên toàn AWS → gắn account id.
resource "aws_s3_bucket" "backup" {
  bucket = "${var.project}-backup-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_public_access_block" "backup" {
  bucket = aws_s3_bucket.backup.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Versioning: ghi đè một key không làm mất bản cũ — nó thành "noncurrent version". IAM user
# backup không có quyền xóa version, nên kẻ chiếm được server không phá được backup đã có.
resource "aws_s3_bucket_versioning" "backup" {
  bucket = aws_s3_bucket.backup.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "backup" {
  bucket = aws_s3_bucket.backup.id

  # Lifecycle của bucket có versioning phải được tạo sau khi versioning bật.
  depends_on = [aws_s3_bucket_versioning.backup]

  rule {
    id     = "expire-old-backups"
    status = "Enabled"

    filter {}

    expiration {
      days = var.backup_retention_days
    }

    noncurrent_version_expiration {
      noncurrent_days = var.backup_retention_days
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}

# Lightsail không gắn được IAM role cho instance, nên server cần access key dài hạn.
# Giới hạn thiệt hại: user này CHỈ ghi được. Kẻ chiếm được server không đọc được bản
# backup cũ; ghi đè lên chúng thì bản cũ vẫn còn nhờ versioning. Khôi phục thì dùng tài
# khoản của chính bạn.
resource "aws_iam_user" "backup" {
  name = "${var.project}-backup-writer"
}

resource "aws_iam_user_policy" "backup" {
  name = "put-backups-only"
  user = aws_iam_user.backup.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "s3:PutObject"
      Resource = "${aws_s3_bucket.backup.arn}/daily/*"
    }]
  })
}

resource "aws_iam_access_key" "backup" {
  user = aws_iam_user.backup.name
}
