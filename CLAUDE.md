# Jūrų Skautai

Marketing website for the Lithuanian Sea Scouts (Jūrų skautai, Kaunas). Single-page,
static, bilingual (Lithuanian default, English). "Kablys visam gyvenimui!"

## Tech Stack

- **Frontend:** React 19, Vite, TypeScript, i18next (LT/EN)
- **Hosting:** S3 (private bucket) + CloudFront (OAC)
- **Infrastructure:** Terraform (modular), single prod environment
- **CI/CD:** GitHub Actions (Terraform apply → build → S3 sync → CloudFront invalidation)
- **Region:** eu-central-1, CloudFront PriceClass_100

## Architecture

- Static SPA built by Vite, served from a private S3 bucket via CloudFront with an
  Origin Access Control. The bucket is not public; only CloudFront can read it.
- Custom domain (juruskautai.lt) is wired but disabled by default — set
  `acm_certificate_arn` (an ACM cert in us-east-1) to enable the alias + TLS.
  Until then the site serves on the default `*.cloudfront.net` URL.

## Project Structure

```
frontend/
  src/
    components/      One component per page section (Header, Hero, ...)
    i18n/            i18next setup + lt.json / en.json content
  public/assets/     Images and the scout emblem
infra/
  modules/
    s3-frontend/     Private S3 bucket
    cloudfront/      CloudFront distribution + OAC
  environments/
    prod/            Production composition (S3 + CloudFront + bucket policy)
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

# Infrastructure
cd infra/environments/prod && terraform init && terraform plan
```

## Deployment

Push to `main` triggers `.github/workflows/deploy-prod.yml`. Requires repo secrets:
`AWS_ROLE_ARN` (OIDC role) and, optionally, `ACM_CERTIFICATE_ARN`. The Terraform S3
backend bucket (`juru-skautai-terraform-state`) and lock table
(`juru-skautai-terraform-locks`) must exist before the first apply.
