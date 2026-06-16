variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

# Origins allowed to call the API (CloudFront domain + local dev).
variable "cors_allow_origins" {
  type    = list(string)
  default = ["http://localhost:5173"]
}

# Directory holding the built Lambda bundles (dist/{api,authorizer}).
variable "backend_dist_dir" {
  type    = string
  default = "../../../backend/dist"
}

# ARN of a verified SES identity (domain or email) used to send Cognito emails
# (sign-up confirmation codes, password resets). Must be in a Region that Cognito
# supports for SES — the user pool's own Region (eu-central-1) is always valid.
# Leave empty to fall back to the default Cognito-hosted sender (capped at ~50
# emails/day, from no-reply@verificationemail.com).
variable "ses_source_arn" {
  type    = string
  default = ""
}

# From address for Cognito emails. Must belong to the verified SES identity.
# Only used when ses_source_arn is set.
variable "ses_from_email" {
  type    = string
  default = "no-reply@juruskautai.lt"
}
