# Provider configuration moved to providers.tf


# S3 bucket for downloads
resource "aws_s3_bucket" "downloads" {
  bucket = "${var.project_name}-downloads-${var.environment}"
  provider = aws

  # Enable versioning with replication
  versioning {
    enabled = true
    mfa_delete = false
  }

  # Enable replication
  replication_configuration {
    role = aws_iam_role.replication.arn

    rules {
      id     = "backup-all-objects"
      status = "Enabled"

      destination {
        bucket        = aws_s3_bucket.downloads_backup.arn
        storage_class = "STANDARD"
      }
    }
  }
}

# Enable versioning for the bucket
resource "aws_s3_bucket_versioning" "downloads" {
  bucket = aws_s3_bucket.downloads.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Configure public access block
resource "aws_s3_bucket_public_access_block" "downloads" {
  bucket = aws_s3_bucket.downloads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 bucket policy to allow CloudFront access
resource "aws_s3_bucket_policy" "downloads" {
  bucket = aws_s3_bucket.downloads.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontServicePrincipal"
        Effect    = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.downloads.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.downloads.arn
          }
        }
      },
      {
        Sid    = "AllowReplication"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.replication.arn
        }
        Action = [
          "s3:GetObjectVersionForReplication",
          "s3:GetObjectVersionAcl"
        ]
        Resource = "${aws_s3_bucket.downloads.arn}/*"
      }
    ]
  })
}

# ACM Certificate for downloads.rinawarptech.com
resource "aws_acm_certificate" "downloads" {
  domain_name       = "downloads.${var.domain_name}"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# CloudFront Origin Access Control
resource "aws_cloudfront_origin_access_control" "downloads" {
  name                              = "${var.project_name}-downloads-${var.environment}"
  description                       = "Origin Access Control for downloads bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront Response Headers Policy for CORS
resource "aws_cloudfront_response_headers_policy" "downloads" {
  name    = "${var.project_name}-downloads-cors-${var.environment}"
  comment = "Add CORS and security headers for downloads"

  cors_config {
    access_control_allow_credentials = false
    access_control_allow_origins {
      items = ["https://rinawarptech.com", "https://www.rinawarptech.com"]
    }
    access_control_allow_methods {
      items = ["GET", "HEAD", "OPTIONS"]
    }
    access_control_allow_headers {
      items = ["*"]
    }
    origin_override = true
  }

  security_headers_config {
    content_security_policy {
      content_security_policy = "default-src 'none'; img-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'"
      override = true
    }
    content_type_options {
      override = true
    }
    frame_options {
      frame_option = "DENY"
      override = true
    }
    strict_transport_security {
      access_control_max_age_sec = 63072000
      include_subdomains = true
      preload = true
      override = true
    }
    xss_protection {
      mode_block = true
      protection = true
      override = true
    }
  }
}

# CloudFront distribution
resource "aws_cloudfront_distribution" "downloads" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Downloads distribution for ${var.domain_name}"
  price_class         = var.cloudfront_price_class
  wait_for_deployment = false

  origin {
    domain_name              = aws_s3_bucket.downloads.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.downloads.id
    origin_id                = "S3-${aws_s3_bucket.downloads.id}"
  }

  aliases = ["downloads.${var.domain_name}"]

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "S3-${aws_s3_bucket.downloads.id}"

    forwarded_values {
      query_string = false
      headers      = ["Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method"]
      cookies {
        forward = "none"
      }
    }

    # Add CORS headers
    response_headers_policy_id = aws_cloudfront_response_headers_policy.downloads.id

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600  # 1 hour
    max_ttl                = 86400 # 24 hours

    # Enable compression
    compress = true
  }

  custom_error_response {
    error_code         = 403
    response_code      = 404
    response_page_path = "/404.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 404
    response_page_path = "/404.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.downloads.arn
    minimum_protocol_version = "TLSv1.2_2021"
    ssl_support_method       = "sni-only"
  }
}

# DNS records are managed in Cloudflare

# Output ACM certificate validation details for Cloudflare
output "acm_validation_record" {
  description = "The DNS record to create in Cloudflare for ACM certificate validation"
  value = {
    for dvo in aws_acm_certificate.downloads.domain_validation_options : "validation" => {
      name  = dvo.resource_record_name
      type  = dvo.resource_record_type
      value = dvo.resource_record_value
    }
  }
}
