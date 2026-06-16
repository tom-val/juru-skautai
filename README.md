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
| Cognito email service-linked role (for SES sending) | `AWSServiceRoleForAmazonCognitoIdpEmailService` |

### 2. Add the GitHub secret

In the repo: **Settings → Secrets and variables → Actions → New repository secret**

- `AWS_ROLE_ARN` — the role ARN printed by the script

(The SES identity ARN is a default in
[`infra/environments/prod/variables.tf`](infra/environments/prod/variables.tf), not a secret;
the custom-domain cert is created and validated by Terraform — see "Custom domain".)

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

### Email (SES)

Cognito sends confirmation codes through the verified SES identity for `juruskautai.lt`
(its ARN is the `ses_source_arn` default in
[`infra/environments/prod/variables.tf`](infra/environments/prod/variables.tf)), from
`no-reply@juruskautai.lt` (override with `ses_from_email`). Set `ses_source_arn` to `""` to
fall back to Cognito's own low-volume sender (~50/day, `no-reply@verificationemail.com`).

Two requirements:

- **Region:** the SES identity must be in a Region Cognito supports for SES. The user
  pool's own Region, `eu-central-1`, is always valid — keep the identity there.
- **Sandbox:** a fresh SES account is in the *sandbox* and can only email
  **verified** addresses, so confirmation codes to real team leads will silently fail.
  Request **production access** for SES in `eu-central-1` before relying on it.

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

DNS is managed in **Route 53** ([`infra/environments/prod/dns.tf`](infra/environments/prod/dns.tf)),
which is what lets the **bare apex** `juruskautai.lt` serve from CloudFront (apex alias
records — impossible at the previous registrar, which had no ALIAS support). Terraform
creates the hosted zone, an **apex + `*.juruskautai.lt` ACM cert** in `us-east-1`
(DNS-validated automatically), and alias records so both `juruskautai.lt` and
`www.juruskautai.lt` point at the distribution. Email stays on serveriai.lt — `MX`, SPF,
DKIM (tokens read from the SES identity) and DMARC are recreated in the zone, with `MX`
moved off the apex onto `mail.juruskautai.lt` so inbound mail is unaffected.

### One-time migration (staged — the zone must be authoritative before the cert can validate)

The cert validates via DNS in Route 53, but Route 53 isn't authoritative until the
registrar's nameservers point at it. So create the zone first, switch nameservers, then
apply the rest. Run with admin credentials (the GitHub Actions deploy role can take over
afterwards):

```bash
cd infra/environments/prod
terraform init

# 1. Create just the hosted zone, then read its four nameservers.
terraform apply -target=aws_route53_zone.main
terraform output route53_name_servers

# 2. At the registrar (iv.lt), set the domain's nameservers to those four values.
#    From now on you manage records here in Terraform, not in iv.lt's zone editor.
#    Wait until the switch is live (can be minutes to a few hours):
dig +short NS juruskautai.lt        # should list the ns-….awsdns-… servers

# 3. Zone is now authoritative — apply everything. ACM validates, CloudFront attaches
#    the cert, and the apex/www alias records are created.
terraform apply
```

Don't push to `main` (which runs a full `terraform apply` in CI) before step 2 is live —
the cert-validation step would block for ~75 min and then fail. Once migrated, CI applies
are steady-state. **CI also needs the broadened deploy-role permissions (Route 53 / ACM /
SES read) — re-run [`infra/bootstrap-skautai.sh`](infra/bootstrap-skautai.sh) once with
admin credentials to update the role policy.**

## Repository layout

| Path | Purpose |
| --- | --- |
| `frontend/` | React + Vite SPA |
| `backend/` | Node 24 Lambdas (members API, Cognito authorizer) |
| `infra/` | Terraform modules and the prod environment |
| `mockups/` | Static HTML design mockup (reference) |
