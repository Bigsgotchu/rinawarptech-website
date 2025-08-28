variable "aws_region" {
  description = "The AWS region to deploy resources in"
  type        = string
  default     = "us-east-1"  # Use us-east-1 for ACM certificates used with CloudFront
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "rinawarp"
}

variable "domain_name" {
  description = "Base domain name (e.g., rinawarptech.com)"
  type        = string
}

variable "cloudfront_price_class" {
  description = "CloudFront distribution price class"
  type        = string
  default     = "PriceClass_100"  # Use only North America and Europe
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for notifications"
  type        = string
  sensitive   = true
}

variable "compliance_email" {
  description = "Email address for compliance notifications"
  type        = string
  default     = ""
}

variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 365
}

variable "glacier_transition_days" {
  description = "Number of days before transitioning to Glacier"
  type        = number
  default     = 90
}

variable "standard_ia_transition_days" {
  description = "Number of days before transitioning to Standard-IA"
  type        = number
  default     = 30
}

variable "replication_alert_threshold" {
  description = "Maximum allowed replication latency in hours"
  type        = number
  default     = 12
}

variable "monitor_schedule" {
  description = "Schedule expression for backup monitoring"
  type        = string
  default     = "rate(1 day)"
}
