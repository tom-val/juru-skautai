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

## Initial setup (one-time)

Run these steps once per AWS account, before the first deploy.

### 1. Bootstrap AWS resources

[`infra/bootstrap.sh`](infra/bootstrap.sh) creates everything the Terraform backend and
CI/CD need: the state S3 bucket, the DynamoDB lock table, the GitHub Actions OIDC provider,
and the IAM role GitHub Actions assumes to deploy. It is idempotent — safe to re-run.

The easiest way is **AWS CloudShell** (it already has the AWS CLI and admin credentials):

1. Open the [AWS Console](https://console.aws.amazon.com/), pick region **eu-central-1**,
   and launch **CloudShell** (the terminal icon in the top bar).
2. Upload the script (CloudShell **Actions → Upload file**) or paste its contents, then run:

   ```bash
   bash bootstrap.sh
   ```

3. Copy the `AWS_ROLE_ARN` it prints at the end.

It creates:

| Resource | Name |
| --- | --- |
| State bucket (versioned, encrypted, private) | `juru-skautai-terraform-state` |
| Lock table | `juru-skautai-terraform-locks` |
| OIDC provider | `token.actions.githubusercontent.com` |
| Deploy role | `juru-skautai-github-actions` |

### 2. Add the GitHub secret

In the repo: **Settings → Secrets and variables → Actions → New repository secret**

- `AWS_ROLE_ARN` — the role ARN printed by the script
- `ACM_CERTIFICATE_ARN` *(optional)* — only when adding the custom domain (see below)

The workflow uses a `Prod` environment, so also create it under
**Settings → Environments → New environment → `Prod`**.

### 3. First deploy

Push to `main` — `.github/workflows/deploy-prod.yml` runs Terraform apply → `npm run build`
→ `aws s3 sync` → CloudFront invalidation. The site comes up on the
`*.cloudfront.net` URL shown in the Terraform output `cloudfront_domain_name`.

## Abilities tracker (accounts + persistence)

The `/gebejimai` abilities tracker is backed by AWS so progress is saved per member:

- **Team leads** register at `/vadovas` (email + password, name + tuntas) via **Cognito**
  and confirm their email with a code, then add members from the dashboard
  (`/vadovas/skydelis`). Each member gets a unique ID (`firstnamelastname-xxxx`).
- **Members** open `/narys/<id>` (or type their ID at `/gebejimai`) — no password; the ID
  is the credential. Progress is stored in **DynamoDB**.
- A **Node 24 Lambda** handles the data API behind **API Gateway (HTTP API)**; a second
  **Lambda authorizer** validates the Cognito token on the admin (lead) routes.

Backend code lives in [`backend/`](backend/) (bundled with esbuild). Build + test:

```bash
cd backend
npm install
npm run build   # → dist/{api,authorizer}  (Terraform zips these)
npm test
```

The frontend reads `VITE_API_URL`, `VITE_USER_POOL_ID`, `VITE_USER_POOL_CLIENT_ID`
(injected from Terraform outputs in CI; see [`frontend/.env.example`](frontend/.env.example)).

## Infrastructure

Terraform provisions a private S3 bucket + CloudFront distribution (OAC) and the tracker
backend (Cognito, DynamoDB, Lambdas, API Gateway) in `eu-central-1`. To run it locally
instead of via CI (requires the bootstrap above), **build the Lambdas first** so the zips
exist:

```bash
cd backend && npm ci && npm run build
cd ../infra/environments/prod
terraform init
terraform plan
terraform apply
```

## Custom domain (juruskautai.lt)

The site serves on the default `*.cloudfront.net` URL until a domain is wired up. To use
`juruskautai.lt`, create an ACM certificate in **us-east-1** (CloudFront only accepts certs
from that region), then either set the `ACM_CERTIFICATE_ARN` GitHub secret or pass it
directly:

```bash
terraform apply -var="acm_certificate_arn=arn:aws:acm:us-east-1:...:certificate/..."
```

This enables the `juruskautai.lt` / `www.juruskautai.lt` aliases. Point the domain's DNS at
the CloudFront distribution afterwards.

## Repository layout

| Path | Purpose |
| --- | --- |
| `frontend/` | React + Vite SPA |
| `backend/` | Node 24 Lambdas (members API, Cognito authorizer) |
| `infra/` | Terraform modules and the prod environment |
| `mockups/` | Static HTML design mockup (reference) |
