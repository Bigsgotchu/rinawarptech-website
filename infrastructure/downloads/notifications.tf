# SNS Topics for different notification types
resource "aws_sns_topic" "download_notifications" {
  name = "download-notifications-${var.environment}"
  
  # Enable filtering by type and platform
  content_based_deduplication = false
  fifo_topic = false
  
  tags = {
    Name = "Download Notifications"
  }
}

# Slack notification Lambda
resource "aws_lambda_function" "slack_notifier" {
  filename         = data.archive_file.notify_lambda.output_path
  function_name    = "download-slack-notifier-${var.environment}"
  role            = aws_iam_role.notify_lambda_role.arn
  handler         = "notify_downloads.lambda_handler"
  runtime         = "python3.10"
  timeout         = 60
  memory_size     = 256

  environment {
    variables = {
      DOWNLOADS_TABLE  = aws_dynamodb_table.downloads.name
      TOPIC_ARN       = aws_sns_topic.download_notifications.arn
      REPORTS_BUCKET  = aws_s3_bucket.reports.id
      SLACK_WEBHOOK   = var.slack_webhook_url
    }
  }
}

# Reports bucket
resource "aws_s3_bucket" "reports" {
  bucket = "${var.project_name}-reports-${var.environment}"
  acl    = "private"

  website {
    index_document = "index.html"
    error_document = "error.html"
  }

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET"]
    allowed_origins = ["https://rinawarptech.com"]
    max_age_seconds = 3000
  }

  lifecycle_rule {
    enabled = true

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    expiration {
      days = 90
    }
  }
}

# Weekly trend report Lambda trigger
resource "aws_cloudwatch_event_rule" "weekly_report" {
  name                = "weekly-download-report-${var.environment}"
  description         = "Trigger weekly download trend report"
  schedule_expression = "rate(7 days)"
}

resource "aws_cloudwatch_event_target" "report_lambda" {
  rule      = aws_cloudwatch_event_rule.weekly_report.name
  target_id = "WeeklyReport"
  arn       = aws_lambda_function.slack_notifier.arn
}

# Lambda permission for CloudWatch Events
resource "aws_lambda_permission" "allow_cloudwatch" {
  statement_id  = "AllowCloudWatchInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.slack_notifier.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.weekly_report.arn
}

# Geographic acceleration with Route53 latency routing
resource "aws_s3_bucket" "downloads_eu" {
  provider = aws.eu
  bucket   = "${var.project_name}-downloads-eu-${var.environment}"
  
  versioning {
    enabled = true
  }
}

resource "aws_s3_bucket" "downloads_ap" {
  provider = aws.ap
  bucket   = "${var.project_name}-downloads-ap-${var.environment}"
  
  versioning {
    enabled = true
  }
}

# CloudFront distributions for each region
resource "aws_cloudfront_distribution" "downloads_eu" {
  provider = aws.eu
  enabled  = true
  
  origin {
    domain_name = aws_s3_bucket.downloads_eu.bucket_regional_domain_name
    origin_id   = "S3-EU"
    
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.downloads_eu.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-EU"
    viewer_protocol_policy = "redirect-to-https"
    
    forwarded_values {
      query_string = false
      headers      = ["Origin"]
      cookies {
        forward = "none"
      }
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

resource "aws_cloudfront_distribution" "downloads_ap" {
  provider = aws.ap
  enabled  = true
  
  origin {
    domain_name = aws_s3_bucket.downloads_ap.bucket_regional_domain_name
    origin_id   = "S3-AP"
    
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.downloads_ap.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-AP"
    viewer_protocol_policy = "redirect-to-https"
    
    forwarded_values {
      query_string = false
      headers      = ["Origin"]
      cookies {
        forward = "none"
      }
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}


# Cross-region replication
resource "aws_s3_bucket_replication_configuration" "eu_replication" {
  provider = aws.eu
  role     = aws_iam_role.replication.arn
  bucket   = aws_s3_bucket.downloads.id

  rule {
    id     = "replicate-to-eu"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.downloads_eu.arn
      storage_class = "STANDARD"
    }
  }
}

resource "aws_s3_bucket_replication_configuration" "ap_replication" {
  provider = aws.ap
  role     = aws_iam_role.replication.arn
  bucket   = aws_s3_bucket.downloads.id

  rule {
    id     = "replicate-to-ap"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.downloads_ap.arn
      storage_class = "STANDARD"
    }
  }
}

# Enhanced logging and metrics
resource "aws_cloudwatch_log_group" "download_distribution" {
  name              = "/aws/cloudfront/downloads-${var.environment}"
  retention_in_days = 30
}

resource "aws_cloudwatch_metric_alarm" "regional_latency" {
  for_each = {
    us = aws_cloudfront_distribution.downloads.id
    eu = aws_cloudfront_distribution.downloads_eu.id
    ap = aws_cloudfront_distribution.downloads_ap.id
  }
  
  alarm_name          = "downloads-latency-${each.key}-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "TotalLatency"
  namespace           = "AWS/CloudFront"
  period              = 300
  statistic           = "Average"
  threshold           = 1000
  alarm_description   = "Monitor download latency in ${each.key} region"
  alarm_actions       = [aws_sns_topic.download_alerts.arn]

  dimensions = {
    DistributionId = each.value
    Region         = "Global"
  }
}

# Lambda subscription to DynamoDB streams for real-time processing
resource "aws_lambda_event_source_mapping" "dynamodb_stream" {
  event_source_arn  = aws_dynamodb_table.downloads.stream_arn
  function_name     = aws_lambda_function.slack_notifier.arn
  starting_position = "LATEST"
  
  batch_size = 1  # Process one download at a time for real-time notifications
  enabled    = true
}
