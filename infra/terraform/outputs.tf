output "static_ip" {
  description = "Trỏ bản ghi A của tên miền về đây; cũng là giá trị cho variable DEPLOY_HOST trên GitHub."
  value       = aws_lightsail_static_ip.app.ip_address
}

output "ssh_command" {
  value = "ssh ubuntu@${aws_lightsail_static_ip.app.ip_address}"
}

output "backup_bucket" {
  description = "Giá trị cho BACKUP_BUCKET trong /opt/vocab/.env."
  value       = aws_s3_bucket.backup.bucket
}

output "backup_access_key_id" {
  description = "Giá trị cho BACKUP_AWS_ACCESS_KEY_ID."
  value       = aws_iam_access_key.backup.id
}

# Xem bằng:  terraform output -raw backup_secret_access_key
output "backup_secret_access_key" {
  description = "Giá trị cho BACKUP_AWS_SECRET_ACCESS_KEY."
  value       = aws_iam_access_key.backup.secret
  sensitive   = true
}
