terraform {
  required_version = ">= 1.9"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # Không khai báo backend = state lưu ở máy dev (terraform.tfstate, đã gitignore).
  # State chứa access key của IAM user backup — KHÔNG commit, KHÔNG chia sẻ. Xem ADR-014.
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project   = var.project
      ManagedBy = "terraform"
    }
  }
}
