resource "aws_cloudwatch_dashboard" "downloads" {
  dashboard_name = "RinaWarp-Downloads"
  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/CloudFront", "Requests", "DistributionId", aws_cloudfront_distribution.downloads.id, "Region", "Global", { label = "Total Requests" }],
            [".", "BytesDownloaded", ".", ".", ".", ".", { label = "Bytes Downloaded" }],
            [".", "4xxErrorRate", ".", ".", ".", ".", { label = "4xx Error Rate" }],
            [".", "5xxErrorRate", ".", ".", ".", ".", { label = "5xx Error Rate" }]
          ]
          view     = "timeSeries"
          stacked  = false
          region   = "us-east-1"
          period   = 300
          stat     = "Sum"
          title    = "Download Statistics"
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/CloudFront", "TotalErrorRate", "DistributionId", aws_cloudfront_distribution.downloads.id, "Region", "Global", { label = "Error Rate" }],
            [".", "BytesDownloaded", ".", ".", ".", ".", { stat = "SampleCount", label = "Download Count" }]
          ]
          view     = "timeSeries"
          stacked  = false
          region   = "us-east-1"
          period   = 300
          stat     = "Average"
          title    = "Error Rates and Download Counts"
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/S3", "BucketSizeBytes", "BucketName", aws_s3_bucket.downloads.id, "StorageType", "StandardStorage", { label = "Total Storage" }],
            [".", "NumberOfObjects", ".", ".", ".", ".", { label = "Number of Objects", yAxis = "right" }]
          ]
          view     = "timeSeries"
          stacked  = false
          region   = "us-east-1"
          period   = 86400
          stat     = "Average"
          title    = "S3 Storage Statistics"
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/CloudFront", "BytesDownloaded", "DistributionId", aws_cloudfront_distribution.downloads.id, "Region", "Global", "platform", "macos", { label = "macOS Downloads" }],
            ["AWS/CloudFront", "BytesDownloaded", "DistributionId", aws_cloudfront_distribution.downloads.id, "Region", "Global", "platform", "windows", { label = "Windows Downloads" }],
            ["AWS/CloudFront", "BytesDownloaded", "DistributionId", aws_cloudfront_distribution.downloads.id, "Region", "Global", "platform", "linux", { label = "Linux Downloads" }]
          ]
          view     = "pie"
          region   = "us-east-1"
          period   = 86400
          stat     = "Sum"
          title    = "Downloads by Platform"
        }
      }
    ]
  })
}

# High error rate alarm
resource "aws_cloudwatch_metric_alarm" "high_error_rate" {
  alarm_name          = "downloads-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "TotalErrorRate"
  namespace           = "AWS/CloudFront"
  period              = "300"
  statistic           = "Average"
  threshold           = "5"
  alarm_description   = "This metric monitors error rate for downloads"
  alarm_actions       = [aws_sns_topic.download_alerts.arn]
  dimensions = {
    DistributionId = aws_cloudfront_distribution.downloads.id
    Region         = "Global"
  }
}

# Unusual download spike alarm
resource "aws_cloudwatch_metric_alarm" "download_spike" {
  alarm_name          = "downloads-unusual-spike"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Requests"
  namespace           = "AWS/CloudFront"
  period              = "300"
  statistic           = "Sum"
  threshold           = "1000"  # Adjust based on normal traffic
  alarm_description   = "This metric detects unusual spikes in download traffic"
  alarm_actions       = [aws_sns_topic.download_alerts.arn]
  dimensions = {
    DistributionId = aws_cloudfront_distribution.downloads.id
    Region         = "Global"
  }
}

# S3 bucket size alarm
resource "aws_cloudwatch_metric_alarm" "bucket_size" {
  alarm_name          = "downloads-bucket-size"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "BucketSizeBytes"
  namespace           = "AWS/S3"
  period              = "86400"
  statistic           = "Average"
  threshold           = "10737418240"  # 10GB
  alarm_description   = "This metric monitors S3 bucket size"
  alarm_actions       = [aws_sns_topic.download_alerts.arn]
  dimensions = {
    BucketName  = aws_s3_bucket.downloads.id
    StorageType = "StandardStorage"
  }
}

# SNS topic for alarms
resource "aws_sns_topic" "download_alerts" {
  name = "download-alerts"
}

# CloudWatch Log Group for download tracking
resource "aws_cloudwatch_log_group" "download_logs" {
  name              = "/rinawarp/downloads"
  retention_in_days = 30
}
