# Jūrų Skautai

Marketing website for the Lithuanian Sea Scouts (Jūrų skautai, Kaunas). Single-page,
static, bilingual (Lithuanian default, English). "Kablys visam gyvenimui!"

## Tech Stack

- **Frontend:** React 19, Vite, TypeScript, i18next (LT/EN), amazon-cognito-identity-js
- **Hosting:** S3 (private bucket) + CloudFront (OAC)
- **Abilities tracker backend:** Cognito (team-lead auth), API Gateway (HTTP API) +
  Node 24 Lambdas, DynamoDB. Lambda code in `backend/`, bundled with esbuild.
- **Infrastructure:** Terraform (modular), single prod environment
- **CI/CD:** GitHub Actions (build backend → Terraform apply → build frontend → S3 sync → CloudFront invalidation)
- **Region:** eu-central-1, CloudFront PriceClass_100

## Architecture

- Static SPA built by Vite, served from a private S3 bucket via CloudFront with an
  Origin Access Control. The bucket is not public; only CloudFront can read it.
- Custom domain (juruskautai.lt) is managed in Route 53 (`infra/environments/prod/dns.tf`):
  Terraform creates the hosted zone, an apex + `*.juruskautai.lt` ACM cert (us-east-1,
  DNS-validated), and alias records so **both** the apex and `www` serve from CloudFront.
  Email stays on serveriai.lt (MX/SPF/DKIM/DMARC recreated in the zone). Activated by
  pointing the registrar's nameservers at the zone — see README "Custom domain" for the
  staged migration.
- **Abilities tracker:** team leads sign up at `/vadovas` (Cognito email/password +
  name + tuntas) and confirm their email with a code, then register members from
  `/vadovas/skydelis`. Each member gets a unique ID (`firstnamelastname-xxxx`); members
  open `/narys/<id>` with no password (the ID is the credential). The `api` Lambda
  reads/writes DynamoDB (progress is saved as per-key deltas, validated server-side);
  the `authorizer` Lambda validates the Cognito JWT on admin routes. Progress keys use
  stable task IDs from `abilities.json` (`slug/level/t1`) — never renumber existing IDs.

## Project Structure

```
frontend/
  src/
    components/      One component per page section (Header, Hero, ...)
    pages/           Routed pages (incl. LeadAuth, LeadDashboard, MemberHome, ...)
    auth/            Cognito wrapper + AuthContext
    lib/             abilities.ts (pure helpers) + api.ts (members API client)
    i18n/            i18next setup + lt.json / en.json content
  public/assets/     Images and the scout emblem
backend/
  src/               api.ts, authorizer.ts, members.ts, progress.ts, ids.ts, http.ts
  build.mjs          esbuild → dist/{api,authorizer}/index.mjs
infra/
  modules/
    s3-frontend/     Private S3 bucket
    cloudfront/      CloudFront distribution + OAC
    backend/         Cognito + DynamoDB + Lambdas + API Gateway
  environments/
    prod/            Production composition (S3 + CloudFront + backend + bucket policy)
mockups/             Static HTML design mockup (reference only)
```

## Conventions

- **Language:** British English in code and comments
- **Content:** All copy lives in `src/i18n/{lt,en}.json`; components read it via `t()`.
  Arrays/objects (age groups, FAQ, tuntai) use i18next `returnObjects`.
- **Sections:** One component per section under `src/components/`, composed in `App.tsx`
- **Styling:** Single global stylesheet `src/index.css` (no CSS framework)
- **Terraform:** Modules in `infra/modules/`, composed in `infra/environments/prod/main.tf`
- **Deep content** (Istorija, Įkūrėjas, Atributika, Daina, Biblioteka) is intentionally
  kept out of the one-pager — to be added later as separate pages/routes.

## Commands

```bash
# Frontend
cd frontend && npm install && npm run dev     # Local dev server (http://localhost:5173)
cd frontend && npm run build                   # Production build → dist/
cd frontend && npm run lint                    # Lint

# Backend (abilities tracker Lambdas)
cd backend && npm install && npm run build     # esbuild → dist/{api,authorizer}
cd backend && npm test                         # Unit tests (node --test)

# Infrastructure (build backend first so the Lambda zips exist)
cd backend && npm ci && npm run build
cd infra/environments/prod && terraform init && terraform plan
```

## Deployment

Push to `main` triggers `.github/workflows/deploy-prod.yml`. Requires repo secrets:
`AWS_ROLE_ARN` (OIDC role) and, optionally, `ACM_CERTIFICATE_ARN`.

One-time bootstrap: run `infra/bootstrap.sh` (e.g. in AWS CloudShell) to create the
Terraform state bucket (`juru-skautai-terraform-state`), lock table
(`juru-skautai-terraform-locks`), the GitHub OIDC provider, and the deploy IAM role. The
script is idempotent and prints the `AWS_ROLE_ARN` to set as a repo secret. See README
"Initial setup" for the full walkthrough.
