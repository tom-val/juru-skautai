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
