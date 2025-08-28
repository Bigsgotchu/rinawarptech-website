# Lambda notification role
resource "aws_iam_role" "notify_lambda_role" {
  name = "download-notifier-${var.environment}"

  inline_policy {
    name = "dynamodb-stream-access"
    policy = jsonencode({
      Version = "2012-10-17"
      Statement = [
        {
          Effect = "Allow"
          Action = [
            "dynamodb:GetRecords",
            "dynamodb:GetShardIterator",
            "dynamodb:DescribeStream",
            "dynamodb:ListStreams"
          ]
          Resource = "${aws_dynamodb_table.downloads.arn}/stream/*"
        }
      ]
    })
  }

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

# Lambda notification policy
resource "aws_iam_role_policy" "notify_lambda_policy" {
  name = "download-notifier-policy-${var.environment}"
  role = aws_iam_role.notify_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:Query",
          "dynamodb:GetItem"
        ]
        Resource = [
          aws_dynamodb_table.downloads.arn,
          "${aws_dynamodb_table.downloads.arn}/index/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject"
        ]
        Resource = [
          "${aws_s3_bucket.reports.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = [
          aws_sns_topic.download_notifications.arn
        ]
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

# CloudFront Origin Access Identities
resource "aws_cloudfront_origin_access_identity" "downloads_eu" {
  provider = aws.eu
  comment  = "access-identity-${var.project_name}-downloads-eu-${var.environment}"
}

resource "aws_cloudfront_origin_access_identity" "downloads_ap" {
  provider = aws.ap
  comment  = "access-identity-${var.project_name}-downloads-ap-${var.environment}"
}

# Archive Lambda function code
data "archive_file" "notify_lambda" {
  type        = "zip"
  source_file = "${path.module}/functions/notify_downloads.py"
  output_path = "${path.module}/notify_downloads.zip"
}
