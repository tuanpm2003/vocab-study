resource "aws_lightsail_key_pair" "admin" {
  name       = "${var.project}-admin"
  public_key = var.admin_ssh_public_key
}

resource "aws_lightsail_instance" "app" {
  name              = "${var.project}-app"
  availability_zone = "${var.region}a"
  blueprint_id      = var.blueprint_id
  bundle_id         = var.bundle_id
  key_pair_name     = aws_lightsail_key_pair.admin.name

  user_data = templatefile("${path.module}/user_data.sh.tftpl", {
    deploy_ssh_public_key = var.deploy_ssh_public_key
  })

  lifecycle {
    # Database nằm trên đĩa của chính máy này. Đổi user_data bình thường sẽ khiến Terraform
    # XÓA máy và tạo máy mới — mất sạch dữ liệu. user_data chỉ chạy ở lần khởi động đầu,
    # nên sửa nó sau đó cũng không có tác dụng gì trên máy đang chạy.
    ignore_changes = [user_data]
    # Chặn `terraform destroy` và mọi thay đổi buộc tạo lại máy. Muốn xóa thật: backup,
    # rồi tạm đổi dòng này thành false.
    prevent_destroy = true
  }
}

# IP tĩnh: không có nó, mỗi lần dừng/khởi động lại máy là đổi IP và bản ghi DNS trỏ sai chỗ.
resource "aws_lightsail_static_ip" "app" {
  name = "${var.project}-ip"
}

resource "aws_lightsail_static_ip_attachment" "app" {
  static_ip_name = aws_lightsail_static_ip.app.name
  instance_name  = aws_lightsail_instance.app.name
}

# Resource này THAY toàn bộ danh sách cổng: cổng nào không liệt kê ở đây sẽ bị đóng.
# Cố ý không có 5432 (Postgres), 3000 và 4000 — chỉ Caddy nhận kết nối từ ngoài.
resource "aws_lightsail_instance_public_ports" "app" {
  instance_name = aws_lightsail_instance.app.name

  port_info {
    protocol  = "tcp"
    from_port = 80
    to_port   = 80
    cidrs     = ["0.0.0.0/0"]
  }

  port_info {
    protocol  = "tcp"
    from_port = 443
    to_port   = 443
    cidrs     = ["0.0.0.0/0"]
  }

  port_info {
    protocol  = "tcp"
    from_port = 22
    to_port   = 22
    cidrs     = var.ssh_allowed_cidrs
  }
}
