output "api_url" {
  value = aws_apigatewayv2_stage.default.invoke_url
}

output "user_pool_id" {
  value = aws_cognito_user_pool.leads.id
}

output "user_pool_client_id" {
  value = aws_cognito_user_pool_client.web.id
}

output "members_table_name" {
  value = aws_dynamodb_table.members.name
}
