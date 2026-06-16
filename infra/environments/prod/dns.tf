# --- DNS (Route 53) ---------------------------------------------------------
# The domain's nameservers must be pointed at this zone's `name_servers` (see the
# `route53_name_servers` output) at the registrar (iv.lt). Until that switch is
# done, this zone is not authoritative and the ACM validation below cannot complete
# — so migrate in stages (see README "Custom domain").

locals {
  domain   = "juruskautai.lt"
  mail_ip  = "194.135.87.50" # serveriai.lt mailbox server (kept as-is)
  dns_ttl  = 300
  cert_ttl = 60
}

resource "aws_route53_zone" "main" {
  name = local.domain
}

# --- TLS certificate (us-east-1) covering the apex AND the wildcard ---------
resource "aws_acm_certificate" "main" {
  provider                  = aws.us_east_1
  domain_name               = local.domain
  subject_alternative_names = ["*.${local.domain}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# One validation record per distinct name (apex + wildcard often share one).
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id         = aws_route53_zone.main.zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  ttl             = local.cert_ttl
  allow_overwrite = true
}

# Gated on domain_live: waits for the cert to be issued, which can only happen once the
# registrar's nameservers point at this zone so ACM can resolve the records above.
resource "aws_acm_certificate_validation" "main" {
  count = var.domain_live ? 1 : 0

  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}

# --- Website: apex + www both alias to CloudFront ---------------------------
# Alias records are allowed at the apex (unlike CNAME) and need no fixed IP. Gated on
# domain_live so they only appear once CloudFront is actually serving the domain.
resource "aws_route53_record" "apex_a" {
  count   = var.domain_live ? 1 : 0
  zone_id = aws_route53_zone.main.zone_id
  name    = local.domain
  type    = "A"

  alias {
    name                   = module.cloudfront.distribution_domain_name
    zone_id                = module.cloudfront.distribution_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "apex_aaaa" {
  count   = var.domain_live ? 1 : 0
  zone_id = aws_route53_zone.main.zone_id
  name    = local.domain
  type    = "AAAA"

  alias {
    name                   = module.cloudfront.distribution_domain_name
    zone_id                = module.cloudfront.distribution_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www_a" {
  count   = var.domain_live ? 1 : 0
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.${local.domain}"
  type    = "A"

  alias {
    name                   = module.cloudfront.distribution_domain_name
    zone_id                = module.cloudfront.distribution_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www_aaaa" {
  count   = var.domain_live ? 1 : 0
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.${local.domain}"
  type    = "AAAA"

  alias {
    name                   = module.cloudfront.distribution_domain_name
    zone_id                = module.cloudfront.distribution_hosted_zone_id
    evaluate_target_health = false
  }
}

# --- Email: kept on serveriai.lt -------------------------------------------
# MX moves off the apex (the apex now serves the website) onto a dedicated mail
# host, so inbound mail still lands on the same server.
resource "aws_route53_record" "mail_a" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "mail.${local.domain}"
  type    = "A"
  ttl     = local.dns_ttl
  records = [local.mail_ip]
}

resource "aws_route53_record" "mx" {
  zone_id = aws_route53_zone.main.zone_id
  name    = local.domain
  type    = "MX"
  ttl     = local.dns_ttl
  records = ["10 mail.${local.domain}"]
}

# SPF: `mx` authorises the mailbox server (mail.juruskautai.lt → mail_ip); the old
# `a` mechanism is dropped because the apex now points at CloudFront, not the server.
resource "aws_route53_record" "spf" {
  zone_id = aws_route53_zone.main.zone_id
  name    = local.domain
  type    = "TXT"
  ttl     = local.dns_ttl
  records = ["v=spf1 mx include:spf.serveriai.lt include:amazonses.com ~all"]
}

resource "aws_route53_record" "dmarc" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "_dmarc.${local.domain}"
  type    = "TXT"
  ttl     = local.dns_ttl
  records = ["v=DMARC1; p=none;"]
}

# DKIM (SES Easy DKIM). Tokens are read straight from the verified SES identity so
# they are never transcribed by hand — keeps signing intact after the NS switch.
data "aws_sesv2_email_identity" "main" {
  email_identity = local.domain
}

resource "aws_route53_record" "dkim" {
  for_each = toset(data.aws_sesv2_email_identity.main.dkim_signing_attributes[0].tokens)

  zone_id = aws_route53_zone.main.zone_id
  name    = "${each.value}._domainkey.${local.domain}"
  type    = "CNAME"
  ttl     = local.dns_ttl
  records = ["${each.value}.dkim.amazonses.com"]
}
