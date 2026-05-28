# Jūrų Skautai

Website for the Lithuanian Sea Scouts (Kaunas) — a modern, bilingual (LT/EN) single-page
site. Built with React + Vite, deployed to AWS S3 + CloudFront via Terraform.

## Local development

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
```

Edit content in `frontend/src/i18n/lt.json` and `en.json`; edit layout/sections in
`frontend/src/components/`.

## Build

```bash
cd frontend
npm run build    # outputs to frontend/dist/
npm run preview  # preview the production build locally
```

## Infrastructure

Terraform provisions a private S3 bucket and a CloudFront distribution (OAC) in
`eu-central-1`.

```bash
cd infra/environments/prod
terraform init
terraform plan
terraform apply
```

One-time bootstrap (before the first apply): create the state bucket
`juru-skautai-terraform-state` and the DynamoDB lock table
`juru-skautai-terraform-locks`.

The site serves on the default `*.cloudfront.net` URL. To use `juruskautai.lt`, create an
ACM certificate in **us-east-1** and pass its ARN:

```bash
terraform apply -var="acm_certificate_arn=arn:aws:acm:us-east-1:...:certificate/..."
```

## Deployment

Pushes to `main` run `.github/workflows/deploy-prod.yml`: Terraform apply → `npm run build`
→ `aws s3 sync` → CloudFront invalidation. Configure repo secrets `AWS_ROLE_ARN` and
(optionally) `ACM_CERTIFICATE_ARN`.

## Repository layout

| Path | Purpose |
| --- | --- |
| `frontend/` | React + Vite SPA |
| `infra/` | Terraform modules and the prod environment |
| `mockups/` | Static HTML design mockup (reference) |
