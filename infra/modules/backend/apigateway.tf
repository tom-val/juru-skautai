# HTTP API fronting the data Lambda. Admin routes go through the Cognito Lambda
# authorizer; member routes are open (the unique ID is the credential).
resource "aws_apigatewayv2_api" "http" {
  name          = "${local.name}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = var.cors_allow_origins
    allow_methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization"]
    max_age       = 3600
  }
}

resource "aws_apigatewayv2_integration" "api" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.api.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id                            = aws_apigatewayv2_api.http.id
  name                              = "${local.name}-cognito"
  authorizer_type                   = "REQUEST"
  authorizer_uri                    = aws_lambda_function.authorizer.invoke_arn
  authorizer_payload_format_version = "2.0"
  enable_simple_responses           = true
  identity_sources                  = ["$request.header.Authorization"]
  authorizer_result_ttl_in_seconds  = 300
}

locals {
  # route_key => protected by the Cognito authorizer?
  routes = {
    # Lead routes (group management + confirming members' progress)
    "GET /groups"                                       = true
    "POST /groups"                                      = true
    "POST /groups/join"                                 = true
    "GET /groups/{groupId}"                             = true
    "PATCH /groups/{groupId}"                           = true
    "DELETE /groups/{groupId}"                          = true
    "POST /groups/{groupId}/invite"                     = true
    "DELETE /groups/{groupId}/leads/{leadSub}"          = true
    "POST /groups/{groupId}/members"                    = true
    "GET /groups/{groupId}/members/{memberId}"          = true
    "DELETE /groups/{groupId}/members/{memberId}"       = true
    "PUT /groups/{groupId}/members/{memberId}/progress" = true
    # Member routes (open — the unique ID is the credential)
    "GET /members/{memberId}"          = false
    "PUT /members/{memberId}/progress" = false
  }
}

resource "aws_apigatewayv2_route" "routes" {
  for_each  = local.routes
  api_id    = aws_apigatewayv2_api.http.id
  route_key = each.key
  target    = "integrations/${aws_apigatewayv2_integration.api.id}"

  authorization_type = each.value ? "CUSTOM" : "NONE"
  authorizer_id      = each.value ? aws_apigatewayv2_authorizer.cognito.id : null
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http.id
  name        = "$default"
  auto_deploy = true

  # The member routes are open by design (the unique ID is the credential), so a
  # modest throttle is the other half of that mechanism: it makes brute-forcing the
  # ID space impractical and caps Lambda/DynamoDB spend. The real traffic of a
  # single-troop site is single-digit rps.
  default_route_settings {
    throttling_rate_limit  = 20
    throttling_burst_limit = 50
  }
}

# Allow API Gateway to invoke the data + authorizer Lambdas.
resource "aws_lambda_permission" "apigw_api" {
  statement_id  = "AllowApiGatewayInvokeApi"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_lambda_permission" "apigw_authorizer" {
  statement_id  = "AllowApiGatewayInvokeAuthorizer"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.authorizer.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/authorizers/*"
}
