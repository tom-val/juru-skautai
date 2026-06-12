locals {
  name     = "${var.project_name}-${var.environment}"
  fn_names = toset(["api", "authorizer"])
}

# --- Packaging: zip each pre-built esbuild bundle ---
data "archive_file" "fn" {
  for_each    = local.fn_names
  type        = "zip"
  source_dir  = "${path.module}/${var.backend_dist_dir}/${each.key}"
  output_path = "${path.module}/.build/${each.key}.zip"
}

# --- Execution role (shared by all three functions) ---
data "aws_iam_policy_document" "assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda" {
  name               = "${local.name}-lambda"
  assume_role_policy = data.aws_iam_policy_document.assume.json
}

resource "aws_iam_role_policy_attachment" "logs" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "dynamodb" {
  statement {
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
      "dynamodb:Query",
    ]
    resources = [
      aws_dynamodb_table.members.arn,
      "${aws_dynamodb_table.members.arn}/index/*",
    ]
  }
}

resource "aws_iam_role_policy" "dynamodb" {
  name   = "dynamodb-access"
  role   = aws_iam_role.lambda.id
  policy = data.aws_iam_policy_document.dynamodb.json
}

# --- Functions ---
resource "aws_lambda_function" "api" {
  function_name    = "${local.name}-api"
  role             = aws_iam_role.lambda.arn
  runtime          = "nodejs24.x"
  handler          = "index.handler"
  filename         = data.archive_file.fn["api"].output_path
  source_code_hash = data.archive_file.fn["api"].output_base64sha256
  timeout          = 10
  memory_size      = 256

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.members.name
    }
  }
}

resource "aws_lambda_function" "authorizer" {
  function_name    = "${local.name}-authorizer"
  role             = aws_iam_role.lambda.arn
  runtime          = "nodejs24.x"
  handler          = "index.handler"
  filename         = data.archive_file.fn["authorizer"].output_path
  source_code_hash = data.archive_file.fn["authorizer"].output_base64sha256
  timeout          = 10
  memory_size      = 256

  environment {
    variables = {
      USER_POOL_ID        = aws_cognito_user_pool.leads.id
      USER_POOL_CLIENT_ID = aws_cognito_user_pool_client.web.id
    }
  }
}

# --- Log groups (explicit, with retention) ---
resource "aws_cloudwatch_log_group" "fn" {
  for_each          = local.fn_names
  name              = "/aws/lambda/${local.name}-${each.key}"
  retention_in_days = 14
}
