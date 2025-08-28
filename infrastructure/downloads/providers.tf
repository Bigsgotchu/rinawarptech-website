terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  # You may want to configure a backend for state storage
  # backend "s3" {
  #   bucket = "rinawarptech-terraform-state"
  #   key    = "downloads/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

# AWS provider for primary region (US)
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.environment
      ManagedBy   = "Terraform"
      Project     = var.project_name
    }
  }
}

# AWS provider for EU region
provider "aws" {
  alias  = "eu"
  region = "eu-west-1"

  default_tags {
    tags = {
      Environment = var.environment
      ManagedBy   = "Terraform"
      Project     = var.project_name
    }
  }
}

# AWS provider for AP region
provider "aws" {
  alias  = "ap"
  region = "ap-northeast-1"

  default_tags {
    tags = {
      Environment = var.environment
      ManagedBy   = "Terraform"
      Project     = var.project_name
    }
  }
}
