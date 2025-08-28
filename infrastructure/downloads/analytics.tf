# DynamoDB table for download tracking
resource "aws_dynamodb_table" "downloads" {
  name           = "rinawarp-downloads-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "download_id"
  stream_enabled = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  attribute {
    name = "download_id"
    type = "S"
  }

  attribute {
    name = "year_month"
    type = "S"
  }

  attribute {
    name = "platform"
    type = "S"
  }

  attribute {
    name = "version"
    type = "S"
  }

  global_secondary_index {
    name            = "YearMonthIndex"
    hash_key        = "year_month"
    range_key       = "platform"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "PlatformVersionIndex"
    hash_key        = "platform"
    range_key       = "version"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }
}

# Lambda function for processing download logs
resource "aws_lambda_function" "process_downloads" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "rinawarp-process-downloads-${var.environment}"
  role            = aws_iam_role.lambda_role.arn
  handler         = "process_download_logs.lambda_handler"
  runtime         = "python3.10"
  timeout         = 60
  memory_size     = 256

  environment {
    variables = {
      DOWNLOADS_TABLE  = aws_dynamodb_table.downloads.name
      MANIFEST_BUCKET = aws_s3_bucket.downloads.id
    }
  }
}

# Lambda function code
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/functions"
  output_path = "${path.module}/functions.zip"
}

# Lambda IAM role
resource "aws_iam_role" "lambda_role" {
  name = "rinawarp-downloads-lambda-${var.environment}"

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

# Lambda permissions
resource "aws_iam_role_policy" "lambda_policy" {
  name = "rinawarp-downloads-lambda-policy-${var.environment}"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:Query",
          "dynamodb:UpdateItem"
        ]
        Resource = [
          aws_dynamodb_table.downloads.arn,
          "${aws_dynamodb_table.downloads.arn}/index/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject"
        ]
        Resource = [
          "${aws_s3_bucket.downloads.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
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

# CloudFront Lambda@Edge trigger
resource "aws_cloudfront_function" "download_trigger" {
  name    = "rinawarp-download-trigger-${var.environment}"
  runtime = "cloudfront-js-1.0"
  publish = true
  code    = <<-EOF
    function handler(event) {
      var request = event.request;
      var uri = request.uri;
      
      // Only trigger for actual downloads
      if (uri.endsWith('.dmg') || uri.endsWith('.exe') || uri.endsWith('.AppImage')) {
        // Invoke Lambda asynchronously
        var lambda = new aws.lambda();
        lambda.invoke({
          FunctionName: '${aws_lambda_function.process_downloads.function_name}',
          InvocationType: 'Event',
          Payload: JSON.stringify({
            cf: {
              request: request
            }
          })
        }).promise();
      }
      
      return request;
    }
  EOF
}

# Backup bucket for downloads
resource "aws_s3_bucket" "downloads_backup" {
  bucket = "${var.project_name}-downloads-backup-${var.environment}"

  versioning {
    enabled = true
  }

  lifecycle_rule {
    enabled = true

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }
  }
}

# Replication role
resource "aws_iam_role" "replication" {
  name = "rinawarp-downloads-replication-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
      }
    ]
  })
}

# Replication policy
resource "aws_iam_role_policy" "replication" {
  name = "rinawarp-downloads-replication-policy-${var.environment}"
  role = aws_iam_role.replication.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetReplicationConfiguration",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.downloads.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObjectVersionForReplication",
          "s3:GetObjectVersionAcl",
          "s3:GetObjectVersionTagging"
        ]
        Resource = [
          "${aws_s3_bucket.downloads.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ReplicateObject",
          "s3:ReplicateDelete",
          "s3:ReplicateTags"
        ]
        Resource = "${aws_s3_bucket.downloads_backup.arn}/*"
      }
    ]
  })
}

# Enable replication
resource "aws_s3_bucket_replication_configuration" "replication" {
  role   = aws_iam_role.replication.arn
  bucket = aws_s3_bucket.downloads.id

  rule {
    id     = "backup-all-objects"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.downloads_backup.arn
      storage_class = "STANDARD"
    }
  }
}

# Additional CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "download_failure_rate" {
  alarm_name          = "downloads-failure-rate-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "4xxErrorRate"
  namespace           = "AWS/CloudFront"
  period              = 300
  statistic           = "Average"
  threshold           = 10
  alarm_description   = "Monitor rate of failed downloads"
  alarm_actions       = [aws_sns_topic.download_alerts.arn]

  dimensions = {
    DistributionId = aws_cloudfront_distribution.downloads.id
    Region         = "Global"
  }
}

resource "aws_cloudwatch_metric_alarm" "download_latency" {
  alarm_name          = "downloads-latency-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "TotalLatency"
  namespace           = "AWS/CloudFront"
  period              = 300
  statistic           = "Average"
  threshold           = 1000  # 1 second
  alarm_description   = "Monitor download latency"
  alarm_actions       = [aws_sns_topic.download_alerts.arn]

  dimensions = {
    DistributionId = aws_cloudfront_distribution.downloads.id
    Region         = "Global"
  }
}

resource "aws_cloudwatch_metric_alarm" "backup_replication_latency" {
  alarm_name          = "downloads-replication-latency-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ReplicationLatency"
  namespace           = "AWS/S3"
  period              = 300
  statistic           = "Average"
  threshold           = 3600  # 1 hour
  alarm_description   = "Monitor backup replication latency"
  alarm_actions       = [aws_sns_topic.download_alerts.arn]

  dimensions = {
    BucketName = aws_s3_bucket.downloads.id
    RuleName   = "backup-all-objects"
  }
}

resource "aws_cloudwatch_metric_alarm" "backup_replication_failures" {
  alarm_name          = "downloads-replication-failures-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "OperationFailedReplication"
  namespace           = "AWS/S3"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Monitor backup replication failures"
  alarm_actions       = [aws_sns_topic.download_alerts.arn]

  dimensions = {
    BucketName = aws_s3_bucket.downloads.id
    RuleName   = "backup-all-objects"
  }
}

# Download analytics dashboard
resource "aws_cloudwatch_dashboard" "downloads_analytics" {
  dashboard_name = "RinaWarp-Downloads-Analytics-${var.environment}"
  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["RinaWarp/Downloads", "Downloads", "Platform", "macos", { stat = "Sum", period = 3600 }],
            [".", ".", ".", "windows", { stat = "Sum", period = 3600 }],
            [".", ".", ".", "linux", { stat = "Sum", period = 3600 }]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          period  = 3600
          title   = "Downloads by Platform (Hourly)"
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/CloudFront", "Requests", "DistributionId", aws_cloudfront_distribution.downloads.id, { stat = "Sum" }],
            [".", "BytesDownloaded", ".", ".", { stat = "Sum" }],
            [".", "4xxErrorRate", ".", ".", { yAxis = "right" }],
            [".", "5xxErrorRate", ".", ".", { yAxis = "right" }]
          ]
          view    = "timeSeries"
          stacked = false
          region  = "us-east-1"
          period  = 300
          title   = "Download Performance"
        }
      }
    ]
  })
}
