# Create backup buckets in secondary regions
resource "aws_s3_bucket" "downloads_backup_us" {
  provider = aws
  bucket   = "rinawarp-downloads-backup-us-${var.environment}"
}

resource "aws_s3_bucket" "downloads_backup_eu" {
  provider = aws.eu
  bucket   = "rinawarp-downloads-backup-eu-${var.environment}"
}

resource "aws_s3_bucket" "downloads_backup_ap" {
  provider = aws.ap
  bucket   = "rinawarp-downloads-backup-ap-${var.environment}"
}

# Enable versioning on backup buckets
resource "aws_s3_bucket_versioning" "downloads_backup_us" {
  provider = aws
  bucket   = aws_s3_bucket.downloads_backup_us.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_versioning" "downloads_backup_eu" {
  provider = aws.eu
  bucket   = aws_s3_bucket.downloads_backup_eu.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_versioning" "downloads_backup_ap" {
  provider = aws.ap
  bucket   = aws_s3_bucket.downloads_backup_ap.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Set up lifecycle rules for backup buckets
resource "aws_s3_bucket_lifecycle_configuration" "downloads_backup_us" {
  provider = aws
  bucket   = aws_s3_bucket.downloads_backup_us.id

  rule {
    id     = "archive_old_versions"
    status = "Enabled"

    filter {}

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    # Keep backups for 1 year
    expiration {
      days = 365
    }

    # Clean up incomplete multipart uploads
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }

    # Only apply to old versions
    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "STANDARD_IA"
    }

    noncurrent_version_transition {
      noncurrent_days = 60
      storage_class   = "GLACIER"
    }

    noncurrent_version_expiration {
      noncurrent_days = 365
    }
  }

  rule {
    id     = "clean_old_artifacts"
    status = "Enabled"

    filter {
      prefix = "artifacts/"
    }

    transition {
      days          = 30
      storage_class = "GLACIER"
    }

    expiration {
      days = 180
    }
  }
}

# Mirror lifecycle rules for EU and AP backup buckets
resource "aws_s3_bucket_lifecycle_configuration" "downloads_backup_eu" {
  provider = aws.eu
  bucket   = aws_s3_bucket.downloads_backup_eu.id

  rule {
    id     = "archive_old_versions"
    status = "Enabled"

    filter {}

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 365
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "STANDARD_IA"
    }

    noncurrent_version_transition {
      noncurrent_days = 60
      storage_class   = "GLACIER"
    }

    noncurrent_version_expiration {
      noncurrent_days = 365
    }
  }

  rule {
    id     = "clean_old_artifacts"
    status = "Enabled"

    filter {
      prefix = "artifacts/"
    }

    transition {
      days          = 30
      storage_class = "GLACIER"
    }

    expiration {
      days = 180
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "downloads_backup_ap" {
  provider = aws.ap
  bucket   = aws_s3_bucket.downloads_backup_ap.id

  rule {
    id     = "archive_old_versions"
    status = "Enabled"

    filter {}

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 365
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "STANDARD_IA"
    }

    noncurrent_version_transition {
      noncurrent_days = 60
      storage_class   = "GLACIER"
    }

    noncurrent_version_expiration {
      noncurrent_days = 365
    }
  }

  rule {
    id     = "clean_old_artifacts"
    status = "Enabled"

    filter {
      prefix = "artifacts/"
    }

    transition {
      days          = 30
      storage_class = "GLACIER"
    }

    expiration {
      days = 180
    }
  }
}

# Create KMS key for backups
resource "aws_kms_key" "backup" {
  provider                = aws
  description             = "KMS key for backup encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Name = "rinawarp-backup-key-${var.environment}"
  }
}

resource "aws_kms_alias" "backup" {
  provider      = aws
  name          = "alias/rinawarp-backup-${var.environment}"
  target_key_id = aws_kms_key.backup.key_id
}

# Create KMS key for EU region
resource "aws_kms_key" "backup_eu" {
  provider                = aws.eu
  description             = "KMS key for EU backup encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Name = "rinawarp-backup-key-eu-${var.environment}"
  }
}

resource "aws_kms_alias" "backup_eu" {
  provider      = aws.eu
  name          = "alias/rinawarp-backup-eu-${var.environment}"
  target_key_id = aws_kms_key.backup_eu.key_id
}

# Create KMS key for AP region
resource "aws_kms_key" "backup_ap" {
  provider                = aws.ap
  description             = "KMS key for AP backup encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Name = "rinawarp-backup-key-ap-${var.environment}"
  }
}

resource "aws_kms_alias" "backup_ap" {
  provider      = aws.ap
  name          = "alias/rinawarp-backup-ap-${var.environment}"
  target_key_id = aws_kms_key.backup_ap.key_id
}

# Set up cross-region replication
resource "aws_iam_role" "backup_replication" {
  provider = aws
  name     = "s3-bucket-backup-replication-${var.environment}"

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

resource "aws_iam_role_policy" "backup_replication" {
  provider = aws
  name     = "s3-bucket-replication-policy-${var.environment}"
  role     = aws_iam_role.backup_replication.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:GetReplicationConfiguration",
          "s3:ListBucket"
        ]
        Effect = "Allow"
        Resource = [
          aws_s3_bucket.downloads.arn,
          aws_s3_bucket.reports.arn
        ]
      },
      {
        Action = [
          "s3:GetObjectVersionForReplication",
          "s3:GetObjectVersionAcl",
          "s3:GetObjectVersionTagging"
        ]
        Effect = "Allow"
        Resource = [
          "${aws_s3_bucket.downloads.arn}/*",
          "${aws_s3_bucket.reports.arn}/*"
        ]
      },
      {
        Action = [
          "s3:ReplicateObject",
          "s3:ReplicateDelete",
          "s3:ReplicateTags"
        ]
        Effect = "Allow"
        Resource = [
          "${aws_s3_bucket.downloads_backup_us.arn}/*",
          "${aws_s3_bucket.downloads_backup_eu.arn}/*",
          "${aws_s3_bucket.downloads_backup_ap.arn}/*"
        ]
      }
    ]
  })
}

# Configure replication rules
resource "aws_s3_bucket_replication_configuration" "downloads" {
  provider = aws
  role     = aws_iam_role.backup_replication.arn
  bucket   = aws_s3_bucket.downloads.id

  rule {
    id     = "backup_to_us"
    status = "Enabled"

destination {
              encryption_configuration {
                replica_kms_key_id = aws_kms_key.backup.arn
              }
      bucket = aws_s3_bucket.downloads_backup_us.arn
      storage_class = "STANDARD_IA"
    }

          source_selection_criteria {
              sse_kms_encrypted_objects {
                  status = "Disabled"
                }
            }
  }

  rule {
    id     = "backup_to_eu"
    status = "Enabled"

destination {
              encryption_configuration {
                replica_kms_key_id = aws_kms_key.backup_eu.arn
              }
      bucket = aws_s3_bucket.downloads_backup_eu.arn
      storage_class = "STANDARD_IA"
    }

    source_selection_criteria {
      sse_kms_encrypted_objects {
        status = "Enabled"
      }
    }
  }

  rule {
    id     = "backup_to_ap"
    status = "Enabled"

destination {
              encryption_configuration {
                replica_kms_key_id = aws_kms_key.backup_ap.arn
              }
      bucket = aws_s3_bucket.downloads_backup_ap.arn
      storage_class = "STANDARD_IA"
    }

    source_selection_criteria {
      sse_kms_encrypted_objects {
        status = "Enabled"
      }
    }
  }
}

# Set up backup monitoring
resource "aws_cloudwatch_metric_alarm" "backup_failure" {
  provider            = aws
  alarm_name          = "downloads-backup-failure-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "ReplicationLatency"
  namespace           = "AWS/S3"
  period              = "300"
  statistic           = "Average"
  threshold           = "43200" # 12 hours
  alarm_description   = "This metric monitors S3 backup replication delays"
  alarm_actions       = [aws_sns_topic.backup_alerts.arn]

  dimensions = {
    BucketName = aws_s3_bucket.downloads.id
  }
}

resource "aws_sns_topic" "backup_alerts" {
  provider = aws
  name     = "backup-alerts-${var.environment}"
}

# Output backup bucket names
output "backup_bucket_us" {
  value = aws_s3_bucket.downloads_backup_us.id
}

output "backup_bucket_eu" {
  value = aws_s3_bucket.downloads_backup_eu.id
}

output "backup_bucket_ap" {
  value = aws_s3_bucket.downloads_backup_ap.id
}
