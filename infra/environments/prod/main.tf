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
  # Apex + www, both backed by the apex-and-wildcard cert that Terraform validates
  # via Route 53 (see dns.tf). Attached only once domain_live flips to true; until then
  # the distribution stays on its default *.cloudfront.net URL.
  aliases             = var.domain_live ? ["juruskautai.lt", "www.juruskautai.lt"] : []
  acm_certificate_arn = var.domain_live ? one(aws_acm_certificate_validation.main[*].certificate_arn) : ""
}

# --- Backend (Cognito + DynamoDB + Lambda + API Gateway) ---

module "backend" {
  source = "../../modules/backend"

  project_name = local.project_name
  environment  = local.environment

  # Send Cognito confirmation emails through our SES identity when configured.
  ses_source_arn = var.ses_source_arn
  ses_from_email = var.ses_from_email

  # Allow the SPA (CloudFront default URL, the custom domain, and local dev) to call the API.
  cors_allow_origins = [
    "https://${module.cloudfront.distribution_domain_name}",
    "https://juruskautai.lt",
    "https://www.juruskautai.lt",
    "http://localhost:5173",
  ]
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
