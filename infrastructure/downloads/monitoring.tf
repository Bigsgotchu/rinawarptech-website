# IAM role for backup monitoring Lambda
resource "aws_iam_role" "backup_monitor" {
  provider = aws
  name     = "backup-monitor-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# IAM policy for backup monitoring
resource "aws_iam_role_policy" "backup_monitor" {
  provider = aws
  name     = "backup-monitor-policy-${var.environment}"
  role     = aws_iam_role.backup_monitor.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetBucketVersioning",
          "s3:GetBucketEncryption",
          "s3:GetBucketLifecycleConfiguration",
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.downloads.arn,
          "${aws_s3_bucket.downloads.arn}/*",
          aws_s3_bucket.downloads_backup_us.arn,
          "${aws_s3_bucket.downloads_backup_us.arn}/*",
          aws_s3_bucket.downloads_backup_eu.arn,
          "${aws_s3_bucket.downloads_backup_eu.arn}/*",
          aws_s3_bucket.downloads_backup_ap.arn,
          "${aws_s3_bucket.downloads_backup_ap.arn}/*",
          aws_s3_bucket.reports.arn,
          "${aws_s3_bucket.reports.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:GetMetricStatistics",
          "cloudwatch:PutMetricData"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# CloudWatch Log Group for backup monitoring
resource "aws_cloudwatch_log_group" "backup_monitor" {
  provider          = aws
  name              = "/aws/lambda/backup-monitor-${var.environment}"
  retention_in_days = 30
}

# Lambda function for backup monitoring
resource "aws_lambda_function" "backup_monitor" {
  provider         = aws
  filename         = data.archive_file.backup_monitor.output_path
  function_name    = "backup-monitor-${var.environment}"
  role            = aws_iam_role.backup_monitor.arn
  handler         = "backup_monitor.lambda_handler"
  runtime         = "python3.10"
  timeout         = 300
  memory_size     = 256

  environment {
    variables = {
      PRIMARY_BUCKET = aws_s3_bucket.downloads.id
      BACKUP_BUCKETS = jsonencode({
        "${aws_s3_bucket.downloads_backup_us.id}" = "us-east-1",
        "${aws_s3_bucket.downloads_backup_eu.id}" = "eu-west-1",
        "${aws_s3_bucket.downloads_backup_ap.id}" = "ap-northeast-1"
      })
      REPORTS_BUCKET  = aws_s3_bucket.reports.id
      SLACK_WEBHOOK_URL = var.slack_webhook_url
    }
  }
}

# Archive file for Lambda function
data "archive_file" "backup_monitor" {
  type        = "zip"
  source_file = "${path.module}/functions/backup_monitor.py"
  output_path = "${path.module}/functions/backup_monitor.zip"
}

# CloudWatch Event Rule for backup monitoring
resource "aws_cloudwatch_event_rule" "backup_monitor" {
  provider            = aws
  name                = "backup-monitor-${var.environment}"
  description         = "Run backup compliance checks daily"
  schedule_expression = "rate(1 day)"
}

# CloudWatch Event Target
resource "aws_cloudwatch_event_target" "backup_monitor" {
  provider = aws
  rule      = aws_cloudwatch_event_rule.backup_monitor.name
  target_id = "BackupMonitor"
  arn       = aws_lambda_function.backup_monitor.arn
}

# Lambda permission for CloudWatch Events
resource "aws_lambda_permission" "backup_monitor" {
  provider      = aws
  statement_id  = "AllowCloudWatchInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.backup_monitor.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.backup_monitor.arn
}

# CloudWatch Metric Alarms
resource "aws_cloudwatch_metric_alarm" "backup_compliance_failures" {
  provider            = aws
  alarm_name          = "backup-compliance-failures-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ComplianceFailures"
  namespace           = "RinaWarp/Backups"
  period              = 86400
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Alert on any backup compliance failures"
  alarm_actions       = [aws_sns_topic.backup_alerts.arn]

  dimensions = {
    Environment = var.environment
  }
}

# Compliance Report Dashboard
resource "aws_cloudwatch_dashboard" "backup_compliance" {
  provider      = aws
  dashboard_name = "backup-compliance-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        x    = 0
        y    = 0
        width = 12
        height = 6
        properties = {
          metrics = [
            ["RinaWarp/Backups", "ReplicationLatency", "Region", "us-east-1", "Bucket", aws_s3_bucket.downloads.id],
            [".", ".", ".", "eu-west-1", ".", aws_s3_bucket.downloads_backup_eu.id],
            [".", ".", ".", "ap-northeast-1", ".", aws_s3_bucket.downloads_backup_ap.id]
          ]
          view = "timeSeries"
          stacked = false
          region = "us-east-1"
          period = 3600
          stat = "Average"
          title = "Replication Latency by Region"
        }
      },
      {
        type = "metric"
        x    = 12
        y    = 0
        width = 12
        height = 6
        properties = {
          metrics = [
            ["RinaWarp/Backups", "ComplianceFailures", "Environment", var.environment]
          ]
          view = "timeSeries"
          stacked = false
          region = "us-east-1"
          period = 86400
          stat = "Sum"
          title = "Daily Compliance Failures"
        }
      }
    ]
  })
}

# S3 bucket for compliance reports
resource "aws_s3_bucket" "compliance_reports" {
  provider = aws
  bucket   = "rinawarp-compliance-reports-${var.environment}"
}

resource "aws_s3_bucket_versioning" "compliance_reports" {
  provider = aws
  bucket   = aws_s3_bucket.compliance_reports.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "compliance_reports" {
  provider = aws
  bucket   = aws_s3_bucket.compliance_reports.id

  rule {
    id     = "archive_old_reports"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "GLACIER"
    }

    expiration {
      days = 365
    }

    filter {}
  }
}

# Set up notifications for compliance reports
resource "aws_sns_topic" "compliance_alerts" {
  provider = aws
  name     = "compliance-alerts-${var.environment}"
}

resource "aws_sns_topic_subscription" "compliance_email" {
  count     = var.compliance_email != "" ? 1 : 0
  provider  = aws
  topic_arn = aws_sns_topic.compliance_alerts.arn
  protocol  = "email"
  endpoint  = var.compliance_email
}
