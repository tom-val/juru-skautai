output "distribution_domain_name" {
  value = aws_cloudfront_distribution.frontend.domain_name
}

output "distribution_id" {
  value = aws_cloudfront_distribution.frontend.id
}

output "distribution_arn" {
  value = aws_cloudfront_distribution.frontend.arn
}

# CloudFront's fixed hosted-zone ID — used as the target of Route 53 alias records.
output "distribution_hosted_zone_id" {
  value = aws_cloudfront_distribution.frontend.hosted_zone_id
}
