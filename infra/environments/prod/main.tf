locals {
  project_name = "juru-skautai"
  environment  = "prod"
}

# --- Frontend (S3 + CloudFront) ---

module "s3_frontend" {
  source = "../../modules/s3-frontend"

  project_name = local.project_name
  environment  = local.environment
}

module "cloudfront" {
  source = "../../modules/cloudfront"

  project_name                   = local.project_name
  environment                    = local.environment
  s3_bucket_regional_domain_name = module.s3_frontend.bucket_regional_domain_name
  # The cert is a *.juruskautai.lt wildcard, which covers www (and any other single-label
  # subdomain) but NOT the bare apex juruskautai.lt — so the apex is not served here.
  aliases             = var.acm_certificate_arn != "" ? ["www.juruskautai.lt"] : []
  acm_certificate_arn = var.acm_certificate_arn
}

# --- Backend (Cognito + DynamoDB + Lambda + API Gateway) ---

module "backend" {
  source = "../../modules/backend"

  project_name = local.project_name
  environment  = local.environment

  # Send Cognito confirmation emails through our SES identity when configured.
  ses_source_arn = var.ses_source_arn
  ses_from_email = var.ses_from_email

  # Allow the SPA (CloudFront, optional custom domain) and local dev to call the API.
  cors_allow_origins = concat(
    ["https://${module.cloudfront.distribution_domain_name}", "http://localhost:5173"],
    var.acm_certificate_arn != "" ? ["https://www.juruskautai.lt"] : [],
  )
}

# S3 bucket policy granting CloudFront OAC read access.
resource "aws_s3_bucket_policy" "frontend" {
  bucket = module.s3_frontend.bucket_id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "AllowCloudFrontOAC"
      Effect = "Allow"
      Principal = {
        Service = "cloudfront.amazonaws.com"
      }
      Action   = "s3:GetObject"
      Resource = "${module.s3_frontend.bucket_arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = module.cloudfront.distribution_arn
        }
      }
    }]
  })
}
