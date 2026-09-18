# Member records. Progress is stored inline as a map on the item
# (task key → "done" | "pending"; pre-confirmation records hold `true` = done).
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

  attribute {
    name = "groupId"
    type = "S"
  }

  # Members registered by a given lead. Only used to migrate pre-groups records
  # (which have no groupId) into that lead's default group.
  global_secondary_index {
    name            = "leadSub-index"
    hash_key        = "leadSub"
    projection_type = "ALL"
  }

  # List all members of a group.
  global_secondary_index {
    name            = "groupId-index"
    hash_key        = "groupId"
    projection_type = "ALL"
  }
}

# Groups + the leads who manage them. Composite key: groupId + sk, where
#   sk = "META"        → the group (name, tuntas, invite code)
#   sk = "LEAD#<sub>"  → a lead's membership (role: owner | lead)
resource "aws_dynamodb_table" "groups" {
  name         = "${var.project_name}-${var.environment}-groups"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "groupId"
  range_key    = "sk"

  attribute {
    name = "groupId"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  attribute {
    name = "leadSub"
    type = "S"
  }

  attribute {
    name = "inviteCode"
    type = "S"
  }

  # A lead's group memberships (only LEAD# items carry leadSub).
  global_secondary_index {
    name            = "leadSub-index"
    hash_key        = "leadSub"
    projection_type = "ALL"
  }

  # Join by invite code (only META items carry inviteCode).
  global_secondary_index {
    name            = "inviteCode-index"
    hash_key        = "inviteCode"
    projection_type = "ALL"
  }
}
