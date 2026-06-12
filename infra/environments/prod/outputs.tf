output "s3_frontend_bucket" {
  value = module.s3_frontend.bucket_id
}

output "cloudfront_distribution_id" {
  value = module.cloudfront.distribution_id
}

output "cloudfront_domain_name" {
  value = module.cloudfront.distribution_domain_name
}

output "api_url" {
  value = module.backend.api_url
}

output "user_pool_id" {
  value = module.backend.user_pool_id
}

output "user_pool_client_id" {
  value = module.backend.user_pool_client_id
}
