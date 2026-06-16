output "s3_frontend_bucket" {
  value = module.s3_frontend.bucket_id
}

output "cloudfront_distribution_id" {
  value = module.cloudfront.distribution_id
}

output "cloudfront_domain_name" {
  value = module.cloudfront.distribution_domain_name
}

# Point the domain's nameservers at these (at the registrar, iv.lt) to activate the zone.
output "route53_name_servers" {
  value = aws_route53_zone.main.name_servers
}

output "acm_certificate_arn" {
  value = one(aws_acm_certificate_validation.main[*].certificate_arn)
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
