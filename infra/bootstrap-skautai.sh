#!/usr/bin/env bash
#
# One-time bootstrap for the juru-skautai infrastructure.
# Run this once in AWS CloudShell (or anywhere with admin AWS credentials) BEFORE
# the first `terraform apply` / first GitHub Actions deploy.
#
# It creates, idempotently:
#   1. The Terraform state S3 bucket (versioned + encrypted + private)
#   2. The Terraform state-lock DynamoDB table
#   3. The GitHub Actions OIDC provider (if not already present)
#   4. An IAM role GitHub Actions assumes to deploy (prints its ARN at the end)
#
# Usage:
#   bash bootstrap.sh
#
set -euo pipefail

# --- Config (edit if needed) ------------------------------------------------
PROJECT="juru-skautai"
REGION="eu-central-1"
GITHUB_REPO="tom-val/juru-skautai"   # owner/repo allowed to assume the role
STATE_BUCKET="${PROJECT}-terraform-state"
LOCK_TABLE="${PROJECT}-terraform-locks"
ROLE_NAME="${PROJECT}-github-actions"
# ---------------------------------------------------------------------------

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
OIDC_HOST="token.actions.githubusercontent.com"
OIDC_ARN="arn:aws:iam::${ACCOUNT_ID}:oidc-provider/${OIDC_HOST}"

echo "Account:  ${ACCOUNT_ID}"
echo "Region:   ${REGION}"
echo "Repo:     ${GITHUB_REPO}"
echo

# --- 1. State bucket --------------------------------------------------------
if aws s3api head-bucket --bucket "${STATE_BUCKET}" 2>/dev/null; then
  echo "✓ State bucket ${STATE_BUCKET} already exists"
else
  echo "→ Creating state bucket ${STATE_BUCKET}"
  aws s3api create-bucket \
    --bucket "${STATE_BUCKET}" \
    --region "${REGION}" \
    --create-bucket-configuration LocationConstraint="${REGION}"
fi
aws s3api put-bucket-versioning \
  --bucket "${STATE_BUCKET}" \
  --versioning-configuration Status=Enabled
aws s3api put-bucket-encryption \
  --bucket "${STATE_BUCKET}" \
  --server-side-encryption-configuration \
    '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
aws s3api put-public-access-block \
  --bucket "${STATE_BUCKET}" \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
echo "✓ State bucket configured (versioning + encryption + private)"
echo

# --- 2. Lock table ----------------------------------------------------------
if aws dynamodb describe-table --table-name "${LOCK_TABLE}" --region "${REGION}" >/dev/null 2>&1; then
  echo "✓ Lock table ${LOCK_TABLE} already exists"
else
  echo "→ Creating lock table ${LOCK_TABLE}"
  aws dynamodb create-table \
    --table-name "${LOCK_TABLE}" \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region "${REGION}" >/dev/null
  aws dynamodb wait table-exists --table-name "${LOCK_TABLE}" --region "${REGION}"
  echo "✓ Lock table created"
fi
echo

# --- 3. GitHub OIDC provider ------------------------------------------------
if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "${OIDC_ARN}" >/dev/null 2>&1; then
  echo "✓ GitHub OIDC provider already exists"
else
  echo "→ Creating GitHub OIDC provider"
  aws iam create-open-id-connect-provider \
    --url "https://${OIDC_HOST}" \
    --client-id-list "sts.amazonaws.com" \
    --thumbprint-list "6938fd4d98bab03faadb97b34396831e3780aea1" >/dev/null
  echo "✓ OIDC provider created"
fi
echo

# --- 4. IAM role for GitHub Actions ----------------------------------------
TRUST_POLICY=$(cat <<JSON
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Federated": "${OIDC_ARN}" },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": { "${OIDC_HOST}:aud": "sts.amazonaws.com" },
      "StringLike": { "${OIDC_HOST}:sub": "repo:${GITHUB_REPO}:*" }
    }
  }]
}
JSON
)

DEPLOY_POLICY=$(cat <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "TerraformState",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::${STATE_BUCKET}",
        "arn:aws:s3:::${STATE_BUCKET}/*"
      ]
    },
    {
      "Sid": "TerraformLock",
      "Effect": "Allow",
      "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem"],
      "Resource": "arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/${LOCK_TABLE}"
    },
    {
      "Sid": "FrontendBucket",
      "Effect": "Allow",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::${PROJECT}-prod-frontend",
        "arn:aws:s3:::${PROJECT}-prod-frontend/*"
      ]
    },
    {
      "Sid": "CloudFront",
      "Effect": "Allow",
      "Action": ["cloudfront:*", "sts:GetCallerIdentity"],
      "Resource": "*"
    },
    {
      "Sid": "MembersTable",
      "Effect": "Allow",
      "Action": "dynamodb:*",
      "Resource": [
        "arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/${PROJECT}-prod-members",
        "arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/${PROJECT}-prod-members/index/*"
      ]
    },
    {
      "Sid": "BackendLambdas",
      "Effect": "Allow",
      "Action": "lambda:*",
      "Resource": "arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${PROJECT}-prod-*"
    },
    {
      "Sid": "LambdaExecRole",
      "Effect": "Allow",
      "Action": "iam:*",
      "Resource": "arn:aws:iam::${ACCOUNT_ID}:role/${PROJECT}-prod-lambda"
    },
    {
      "Sid": "Cognito",
      "Effect": "Allow",
      "Action": "cognito-idp:*",
      "Resource": "*"
    },
    {
      "Sid": "ApiGateway",
      "Effect": "Allow",
      "Action": "apigateway:*",
      "Resource": "arn:aws:apigateway:${REGION}::/*"
    },
    {
      "Sid": "LambdaLogGroups",
      "Effect": "Allow",
      "Action": "logs:*",
      "Resource": [
        "arn:aws:logs:${REGION}:${ACCOUNT_ID}:log-group:/aws/lambda/${PROJECT}-prod-*",
        "arn:aws:logs:${REGION}:${ACCOUNT_ID}:log-group:/aws/lambda/${PROJECT}-prod-*:*"
      ]
    },
    {
      "Sid": "LogsList",
      "Effect": "Allow",
      "Action": "logs:DescribeLogGroups",
      "Resource": "*"
    }
  ]
}
JSON
)

if aws iam get-role --role-name "${ROLE_NAME}" >/dev/null 2>&1; then
  echo "→ Updating trust policy on existing role ${ROLE_NAME}"
  aws iam update-assume-role-policy --role-name "${ROLE_NAME}" --policy-document "${TRUST_POLICY}" >/dev/null
else
  echo "→ Creating role ${ROLE_NAME}"
  aws iam create-role --role-name "${ROLE_NAME}" --assume-role-policy-document "${TRUST_POLICY}" >/dev/null
fi
aws iam put-role-policy \
  --role-name "${ROLE_NAME}" \
  --policy-name "${PROJECT}-deploy" \
  --policy-document "${DEPLOY_POLICY}" >/dev/null
echo "✓ Role ready"
echo

ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"
echo "============================================================"
echo "Bootstrap complete."
echo
echo "Add this as a GitHub repository secret named AWS_ROLE_ARN:"
echo
echo "  ${ROLE_ARN}"
echo
echo "Then push to main (or run terraform apply locally)."
echo "============================================================"
