# Team-lead accounts. Self-signup with standard email verification: Cognito emails a
# confirmation code at signup, which both activates the account and proves email
# ownership (enabling the verified-email account recovery / forgot-password flow).
resource "aws_cognito_user_pool" "leads" {
  name                     = "${local.name}-leads"
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  # Send confirmation codes through our own SES identity (juruskautai.lt) when one is
  # configured; otherwise Cognito falls back to its default low-volume sender.
  dynamic "email_configuration" {
    for_each = var.ses_source_arn != "" ? [1] : []
    content {
      email_sending_account = "DEVELOPER"
      source_arn            = var.ses_source_arn
      from_email_address    = var.ses_from_email
    }
  }

  # Tuntas (scout troop) name, captured at signup alongside the standard `name` attribute.
  schema {
    name                = "tuntas"
    attribute_data_type = "String"
    mutable             = true
    required            = false

    string_attribute_constraints {
      min_length = 1
      max_length = 100
    }
  }

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_uppercase = false
    require_symbols   = false
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }
}

# Public SPA client (no secret). USER_PASSWORD_AUTH for amazon-cognito-identity-js,
# SRP as the standard flow, refresh for session continuity.
resource "aws_cognito_user_pool_client" "web" {
  name         = "${local.name}-web"
  user_pool_id = aws_cognito_user_pool.leads.id

  generate_secret               = false
  prevent_user_existence_errors = "ENABLED"

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]
}
