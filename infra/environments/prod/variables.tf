# ACM certificate ARN (must be in us-east-1) for the custom domain. This is the
# *.juruskautai.lt wildcard cert; the distribution serves www.juruskautai.lt.
# Set to "" to fall back to the default *.cloudfront.net URL.
variable "acm_certificate_arn" {
  type    = string
  default = "arn:aws:acm:us-east-1:054630617930:certificate/5373b9fa-10fd-4e66-9a7d-a2c12c10c0f9"
}

# ARN of the verified SES identity Cognito uses to send confirmation emails.
# Set to "" to fall back to the default Cognito sender. See README "Email (SES)".
variable "ses_source_arn" {
  type    = string
  default = "arn:aws:ses:eu-central-1:054630617930:identity/juruskautai.lt"
}

# From address for Cognito emails (must belong to the SES identity above).
variable "ses_from_email" {
  type    = string
  default = "no-reply@juruskautai.lt"
}
