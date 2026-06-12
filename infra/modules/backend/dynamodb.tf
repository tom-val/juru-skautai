# Member records. Progress is stored inline as a map on the item.
resource "aws_dynamodb_table" "members" {
  name         = "${var.project_name}-${var.environment}-members"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "memberId"

  attribute {
    name = "memberId"
    type = "S"
  }

  attribute {
    name = "leadSub"
    type = "S"
  }

  # List all members belonging to a given team lead.
  global_secondary_index {
    name            = "leadSub-index"
    hash_key        = "leadSub"
    projection_type = "ALL"
  }
}
