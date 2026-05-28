variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "s3_bucket_regional_domain_name" {
  type = string
}

variable "aliases" {
  type    = list(string)
  default = []
}

variable "acm_certificate_arn" {
  type    = string
  default = ""
}
