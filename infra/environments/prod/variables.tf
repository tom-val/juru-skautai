# ACM certificate ARN (in us-east-1) for the custom domain.
# Leave empty to serve on the default *.cloudfront.net URL.
variable "acm_certificate_arn" {
  type    = string
  default = ""
}
