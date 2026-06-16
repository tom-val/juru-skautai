terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }

  backend "s3" {
    bucket         = "juru-skautai-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "eu-central-1"
    encrypt        = true
    dynamodb_table = "juru-skautai-terraform-locks"
  }
}

provider "aws" {
  region = "eu-central-1"

  default_tags {
    tags = {
      Project     = "juru-skautai"
      Environment = "prod"
      ManagedBy   = "terraform"
    }
  }
}

# CloudFront viewer certificates must live in us-east-1, so the ACM cert is created
# through this aliased provider while everything else stays in eu-central-1.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = "juru-skautai"
      Environment = "prod"
      ManagedBy   = "terraform"
    }
  }
}
