variable "project" {
  description = "Tiền tố tên cho mọi tài nguyên."
  type        = string
  default     = "vocab"
}

variable "region" {
  description = "Vùng AWS. Singapore gần Việt Nam nhất."
  type        = string
  default     = "ap-southeast-1"
}

variable "bundle_id" {
  description = "Gói Lightsail. micro_3_0 = 1 GB RAM. Gói 512 MB (nano_3_0) không đủ cho Postgres + NestJS + Next.js."
  type        = string
  default     = "micro_3_0"
}

variable "blueprint_id" {
  description = "Hệ điều hành của instance."
  type        = string
  default     = "ubuntu_24_04"
}

variable "admin_ssh_public_key" {
  description = "Khóa công khai SSH của bạn (nội dung file .pub)."
  type        = string
}

variable "deploy_ssh_public_key" {
  description = "Khóa công khai SSH riêng cho GitHub Actions. Khóa bí mật tương ứng đặt ở secret DEPLOY_SSH_KEY."
  type        = string
}

variable "ssh_allowed_cidrs" {
  description = "Dải IP được SSH vào. Mặc định mở hết vì runner của GitHub không có IP cố định; server chỉ nhận đăng nhập bằng khóa."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "backup_retention_days" {
  description = "S3 tự xóa bản backup cũ hơn số ngày này."
  type        = number
  default     = 30
}

variable "monthly_budget_usd" {
  description = "Ngưỡng cảnh báo chi phí mỗi tháng (USD)."
  type        = number
  default     = 10
}

variable "alert_email" {
  description = "Email nhận cảnh báo chi phí."
  type        = string
}
