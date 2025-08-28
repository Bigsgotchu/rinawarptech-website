output "s3_bucket_name" {
  description = "Name of the S3 bucket storing downloads"
  value       = aws_s3_bucket.downloads.id
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.downloads.id
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.downloads.domain_name
}

output "downloads_domain" {
  description = "Custom domain for downloads"
  value       = "downloads.${var.domain_name}"
}
