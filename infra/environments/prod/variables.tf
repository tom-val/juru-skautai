# Two-phase custom-domain switch (see README "Custom domain").
# false (phase 1): create the Route 53 zone, mail records, and the ACM cert + its
#   validation records — but DON'T wait on validation or attach the domain to CloudFront.
#   This lets the first CI deploy finish without blocking on DNS that isn't authoritative
#   yet. Switch the registrar's nameservers to the zone while this is false.
# true (phase 2): the nameservers now point at Route 53, so confirm cert issuance, attach
#   apex + www to CloudFront, and create the alias records.
variable "domain_live" {
  type    = bool
  default = true
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
