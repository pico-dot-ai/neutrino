# Deployment Runbook

This runbook is for humans and coding agents operating Neutrino across local, staging, and production-like deployments. It is procedural; the architecture source of truth remains [architecture/contract.json](../architecture/contract.json), and baseline deployment details remain in [docs/deployment-baseline.md](deployment-baseline.md).

## Operating Rules

- Do not hand-edit Cloud Run service configuration for normal deployment. Terraform owns service shape, secrets bindings, IAM, ingress, and migration jobs.
- Do not store secrets in repo docs or Linear comments. Use `.env` locally, Vercel env vars for web, and Google Secret Manager for deployed API/Kratos.
- Keep `AUTH_PROVIDER=ory-kratos` for staging and production. `AUTH_PROVIDER=local` is only for local development, bootstrap, or emergency fallback.
- Keep Kratos admin and Postgres private outside local development. Only Kratos public/browser routes should be reachable by users.
- Run database migrations before relying on a deployed API revision that expects new schema.
- Use a dedicated non-production database for integration tests and migration drills. Do not run test writes against `platform_prod`.

## Current Executable Model

This section describes what an agent can operate today. The GitHub-first model is the target roadmap, not the current assumption for GCP/API/Auth deployment.

| Target | Current deployment path | Agent expectation |
| --- | --- | --- |
| Local | Run dependencies, API, and web from the local checkout | Agent can run app processes after dependencies are available |
| Vercel preview | Commit/push a branch and let Vercel build the preview | Agent should use GitHub branch/PR flow, not `vercel deploy`, for normal preview deployment |
| Production web | Merge/push to `main` and let Vercel deploy production | Agent should verify Vercel/GitHub result, not deploy through Vercel CLI unless debugging |
| Production API | Browser-authenticated `gcloud` plus Cloud Build from the current checkout or existing trigger | Agent can execute after GCP browser auth is complete |
| Production Kratos/Auth infra | Browser-authenticated `gcloud` plus Terraform and repo scripts | Agent can execute only with explicit operator approval because this touches auth infrastructure |
| Staging | Not currently deployable from repo docs alone | Agent must stop and reference the staging roadmap tickets |
| Promotion | Not currently a true artifact promotion flow | Agent must stop before claiming staging-to-production promotion |

Current roadmap tickets for the future GitHub-first model:

- `THU-65`: define the GitHub-first deployment contract for humans and agents.
- `THU-66`: codify staging environment for GitHub-driven deploy validation.
- `THU-67`: add GitHub Actions orchestration for GCP deploys using Workload Identity.
- `THU-68`: implement artifact promotion and migration gates from staging to production.
- `THU-69`: add agent-readable auth deployment smoke tests and evidence capture.

## Agent Stop Conditions

Stop and ask for operator action when any of these are true:

- GCP browser auth is required and no authenticated account is active.
- A command would print a secret, token, cookie, DSN, or password.
- Staging deployment is requested before `THU-66` is implemented.
- Staging-to-production promotion is requested before `THU-68` is implemented.
- Production migration is required and no backup/snapshot evidence is available.
- Terraform wants to create, replace, or destroy auth, database, networking, or Secret Manager resources and the operator has not explicitly approved that plan.
- Browser verification requires credentials, an email inbox, or an identity that the agent does not have.

## Environment Matrix

| Environment | Web | API | Auth | Core DB | Object storage | Intended use |
| --- | --- | --- | --- | --- | --- | --- |
| Local | `localhost:3001` | `localhost:4000` | local Kratos public/admin | local Postgres | local filesystem | development, browser E2E, agent verification |
| Preview | Vercel preview | staging/preview API or mocked API | staging Kratos if E2E is needed | staging DB only | staging bucket/local equivalent | branch validation |
| Staging | Vercel staging project or protected preview | Cloud Run staging service | staging Kratos | staging DB | staging bucket | production-like validation and migration rehearsal |
| Production | Vercel production | Cloud Run production service | production Kratos at `auth.pico.ai` | production DB | production bucket | customer-facing runtime |

## Local Runbook

Use local when you need to test and view the full product loop before staging.

Required local processes:

- Postgres on `localhost:5432`
- Kratos public on `localhost:4433`
- Kratos admin on `localhost:4434`
- SMTP sink such as Mailpit or MailHog on `localhost:1025`
- API on `localhost:4000`
- Web on `localhost:3001`

Postgres may be started independently through the operator's local service manager. Kratos and Mailpit are optional until local E2E is requested, but when E2E is requested use the repo scripts below rather than inventing service commands.

Required local env shape is the active `.env` file. Keep web, API, Postgres, and Kratos consistently on `localhost`; do not mix `localhost` and `127.0.0.1` for browser auth cookies or DSNs.

Local dependency check:

```sh
brew tap ory/tap
brew install ory/tap/kratos mailpit

psql --version
kratos version
mailpit version
```

`psql` must point at a local Postgres server that can create roles, databases, and the `vector` extension through `LOCAL_POSTGRES_MAINTENANCE_DATABASE_URL` or the default `postgresql://localhost:5432/postgres`.

Persistent local database entries:

- `CORE_DATABASE_URL`: durable Neutrino core database, `platform_prod`.
- `CORE_TEST_DATABASE_URL`: durable local integration-test database, `platform_test`.
- `PGVECTOR_TEST_DATABASE_URL`: durable pgvector test database, currently `platform_test`.
- `VECTOR_DATABASE_URL`: durable pgvector runtime database, currently `platform_prod`.
- `KRATOS_DSN`: durable Kratos identity/session database, `kratos`.

Kratos and the Kratos DB may be up or down depending on the test being run. When Kratos is running for local E2E, it must use `KRATOS_DSN` from `.env` so identities, verification state, recovery state, and browser sessions survive process restarts.

Local database setup:

```sh
set -a
. ./.env
set +a

npm run db:local:ensure
npm run migrate --workspace @neutrino/core
CORE_DATABASE_URL="$CORE_TEST_DATABASE_URL" npm run migrate --workspace @neutrino/core
```

Render local Kratos config after sourcing `.env`:

```sh
set -a
. ./.env
set +a

npm run kratos:local:render -- /tmp/neutrino-kratos.local.yml
```

The rendered Kratos config includes `dsn: ${KRATOS_DSN}`. If `KRATOS_DSN` is missing, do not start local Kratos for E2E testing because local users will not be reliably durable.

Run local Kratos and Mailpit in separate terminals:

```sh
set -a
. ./.env
set +a

npm run kratos:local:start
npm run mailpit:local:start
```

`npm run kratos:local:start` runs Kratos migrations before serving. Successful migration output is suppressed; if migration fails, the script prints the migration log and exits.

Run local API and web:

```sh
set -a
. ./.env
set +a

npm run dev:api
npm run dev:web:local
```

Local smoke checks:

```sh
curl -fsS http://localhost:4000/health
curl -fsS http://localhost:4000/readyz
curl -I http://localhost:3001/login
curl -I http://localhost:4433/health/ready
```

Local persistence check:

```sh
identity_id="$(curl -fsS -X POST http://localhost:4434/admin/identities \
  -H 'Content-Type: application/json' \
  --data '{"schema_id":"default","traits":{"email":"local-e2e@example.test","username":"locale2e"}}' \
  | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>process.stdout.write(JSON.parse(d).id))')"

curl -fsS "http://localhost:4434/admin/identities/${identity_id}"
```

Stop only the Kratos terminal with `Ctrl-C`, leave Postgres running, restart `npm run kratos:local:start`, and rerun the final `curl`. The identity must still be returned. If it is missing, Kratos is not using the persistent `KRATOS_DSN`.

Local browser E2E checklist:

1. Open `http://localhost:3001/login?next=%2Fadmin`.
2. Start hosted signup from `http://localhost:3001/api/auth/registration/start`, or use the `Create an account` link from the login page. Do not start from `/signup` directly; that route needs a Kratos `flow` query parameter.
3. Use an allowed local email or domain. The checked-in local env shape allows `example.com` and `pico.ai` domains.
4. Complete the Kratos profile step, then complete the Kratos password step when prompted.
5. Read verification email from the local SMTP sink and complete verification when Kratos emits a verification message.
6. Log in and confirm `/admin` loads.
7. Confirm `/api/auth/me` returns a hosted actor.
8. Open `/admin?section=auth` and confirm the user appears with actor, identity, grants, and audit history.
9. Trigger admin reset, disable, and reactivate on a non-critical local test user.
10. Log out and confirm the browser returns to `/login`.

Agent browser note: if browser automation blocks the final cross-origin Kratos credential submit, stop and ask the operator to complete that browser step manually. Do not switch to a different browser surface or bypass the browser policy.

Local failure triage:

- `Missing API_PROXY_SHARED_SECRET`: `.env` was not sourced for web or API.
- `401` from API proxy: web and API have different `API_PROXY_SHARED_SECRET`.
- `/login` renders but `/admin` fails: API, Kratos, or session sync is not reachable from the Next server process.
- Verification email never arrives: SMTP sink is not running or `COURIER_SMTP_CONNECTION_URI` is wrong.
- User can sign up but cannot access product: email verification is required and not complete, or signup allowlist does not include the user.
- `next dev` panics on a missing `.next/dev/cache/turbopack/*.sst` file: stop the web server, remove the generated `apps/web/.next` directory, and restart `npm run dev:web:local`.

## Staging Runbook

Staging is not currently deployable by an agent from repo docs alone. Treat this section as a target shape, not an executable runbook, until `THU-66` is implemented.

Use staging for production-like validation only after the environment has separate service names, databases, buckets, secrets, and Kratos config from production.

Current required staging shape:

- A dedicated Vercel staging project or protected preview environment.
- A dedicated Cloud Run API staging service.
- A dedicated Cloud Run migration job for the staging API.
- A dedicated Kratos public/admin staging pair.
- A dedicated staging core database and Kratos database.
- A dedicated object storage bucket/prefix.
- Dedicated staging secrets in Secret Manager and Vercel.

Staging setup procedure:

Do not execute this as a deployment procedure today. The missing inputs are the staging GCP project or prefix, Terraform backend/prefix, `tfvars`, Vercel project/environment, Cloud Run service names, database names, bucket names, Kratos callback/domain behavior, and secret names.

1. Create or select a staging Google project or staging resource prefix.
2. Create separate Secret Manager values for `OPENAI_API_KEY`, `API_PROXY_SHARED_SECRET`, `CORE_DATABASE_URL`, Kratos DSN/secrets/config, and object storage settings.
3. Create a staging Vercel environment with `API_BASE_URL` pointing to the staging API root URL.
4. Run Terraform for staging with a staging backend prefix and staging service names.
5. Run the staging core migration job.
6. Deploy staging API image.
7. Deploy staging web.
8. Run staging smoke checks and browser E2E.

Staging validation gates:

```sh
npm run test
npm run typecheck
npm run lint
npm run build
npm run architecture:check
```

Staging runtime checks:

```sh
STAGING_API_URL="<staging-api-root-url>"
curl -fsS "$STAGING_API_URL/health"
curl -fsS "$STAGING_API_URL/readyz"
```

Staging browser E2E:

1. Verify `/login` redirects into staging Kratos, not production Kratos.
2. Sign up with a staging-only user.
3. Verify email through staging courier or test mailbox.
4. Confirm `/admin`, `/api/auth/me`, and `/admin?section=auth`.
5. Confirm admin reset/disable/reactivate on a staging-only user.
6. Confirm logout returns to staging `/login`.

## Production Deployment Runbook

Use production when the operator explicitly accepts that staging is not yet codified. Until `THU-66` and `THU-68` are done, this is a direct production deploy with local validation and post-deploy verification, not a true staged promotion.

Pre-production gate:

1. Confirm all code gates pass.
2. Confirm whether this is web-only, API-only, auth-infra, or mixed.
3. Confirm staging is unavailable unless `THU-66` has been completed.
4. Confirm production Secret Manager secrets exist without printing values.
5. Confirm Vercel production env vars exist.
6. Confirm `AUTH_PROVIDER=ory-kratos` and `AUTH_LOCAL_MODE=emergency`.
7. Confirm production DB backup is available or create one before migration.

Production auth setup for GCP:

```sh
gcloud auth login
gcloud auth application-default login
gcloud config set project neutrino-491317
gcloud auth list
gcloud config list project
```

Production secret existence checks:

```sh
npm run secrets:prod:check
```

Do not use `gcloud secrets versions access` in a copied evidence log. It can print secret values.

Production validation before API deploy:

```sh
npm run test
npm run typecheck
npm run lint
npm run build
npm run architecture:check
npm run starter:version:check
```

Production API deploy through Cloud Build:

```sh
CONFIRM_PRODUCTION_API_DEPLOY=yes npm run deploy:api:prod
```

This script runs validation, checks required production Secret Manager versions without printing values, submits Cloud Build, and runs production API verification. Use `SKIP_VALIDATION=1` only when validation has already passed in the same checkout.

Production API post-deploy verification:

```sh
npm run verify:api:prod
```

Production web deploy:

Normal production web deployment is GitHub to Vercel:

1. Commit the web change.
2. Push or merge to `main`.
3. Wait for the Vercel production deployment connected to `main`.
4. Verify the resulting deployment in Vercel or through browser checks.

Use Vercel CLI only for inspection/debugging:

```sh
vercel ls
```

Production browser verification:

1. Open production `/login`.
2. Confirm the login flow uses production Kratos at `auth.pico.ai`.
3. Log in with a known admin.
4. Confirm `/admin` loads.
5. Confirm `/api/auth/me` returns the hosted actor.
6. Confirm `/admin?section=auth` loads without exposing Kratos admin URLs or tokens.
7. Confirm logout returns to `/login`.

## Promotion Procedure

Promotion means moving the same tested artifact and config intent from staging to production. The repo does not currently implement this as an executable flow. Do not claim a staged promotion has happened until `THU-66` and `THU-68` are complete.

Recommended promotion path:

1. Merge feature branch to `main` after code review and validation.
2. Build and deploy the candidate to staging.
3. Run staging migrations.
4. Run staging smoke checks and browser E2E.
5. Record staging evidence in the relevant Linear issue.
6. Create or confirm production database backup.
7. Deploy the same commit/image to production.
8. Run production migration job.
9. Deploy or promote the production web build.
10. Run production smoke checks and browser verification.
11. Record production evidence in Linear with sanitized details.

Promotion evidence should include:

- commit SHA
- API image or Cloud Build ID
- Vercel deployment ID
- migration job execution ID
- staging smoke result
- production smoke result
- browser verification summary
- rollback decision, if any

## Rollback Procedure

Rollback strategy depends on what changed.

Web-only rollback:

```sh
vercel ls
vercel rollback <deployment-url-or-id>
```

API-only rollback:

```sh
SERVICE_URL="$(gcloud run services describe neutrino-api --region=us-central1 --project=neutrino-491317 --format='value(status.url)')"
gcloud run revisions list --service=neutrino-api --region=us-central1 --limit=10
gcloud run services update-traffic neutrino-api --region=us-central1 --to-revisions=<previous-revision>=100
curl -fsS "$SERVICE_URL/health"
curl -fsS "$SERVICE_URL/readyz"
```

Config rollback:

1. Revert the env var or secret value in Vercel or Secret Manager.
2. Redeploy or restart the affected service if needed.
3. Verify `/health`, `/readyz`, `/login`, and `/admin`.

Migration rollback:

1. Stop further deploys.
2. Identify whether the migration is backward compatible.
3. If code can tolerate the migrated schema, roll back code first.
4. If the data migration is destructive or incompatible, restore from the pre-deploy backup into a recovery database first.
5. Validate recovery data before repointing production.
6. Record the incident and exact recovery path in [docs/ops-known-issues.md](ops-known-issues.md).

Current migration rollback limitation: the repo does not maintain formal down migrations. Treat database rollback as restore-from-backup unless a specific forward fix is safer.

## Secret Rotation Procedure

Rotate secrets independently per environment.

Shared proxy secret rotation:

1. Create a new `API_PROXY_SHARED_SECRET` value.
2. Update API Secret Manager value.
3. Deploy or restart API.
4. Update Vercel env var.
5. Redeploy web.
6. Verify `/api/platform/context` through the web app.

Session secret rotation:

1. Update `APP_SESSION_SECRET` in the target web environment.
2. Redeploy web.
3. Expect existing local fallback sessions to be invalidated.
4. Verify hosted Kratos sessions still validate.

Kratos secret rotation:

1. Generate new Kratos cookie/default secrets.
2. Render and store updated Kratos config.
3. Roll Kratos public/admin services.
4. Verify login, logout, recovery, and verification.

Auth infrastructure apply:

```sh
PROJECT_ID=neutrino-491317 CONFIRM_AUTH_INFRA_APPLY=yes scripts/kratos-deploy-gcp.sh
```

Use this only after explicit operator approval. It runs Terraform and executes Kratos bootstrap/migration jobs.

## Agent Checklist

Before changing deployment behavior:

1. Identify whether the change affects web, API, auth, database, object storage, Terraform, or secrets.
2. Update docs before claiming an operational behavior is supported.
3. Run repo validation appropriate to the changed surface.
4. Verify local if the change affects runtime code.
5. Verify staging before production if the change affects auth, persistence, migrations, or deployment config.
6. Update Linear with sanitized evidence and remaining gaps.

After deployment:

1. Confirm service health.
2. Confirm migration job status.
3. Confirm browser-auth flow.
4. Confirm no secret values were printed to Linear, docs, or logs.
5. Add recurring failures to [docs/ops-known-issues.md](ops-known-issues.md).

## Deployment Evidence Template

Use this sanitized template in Linear after a deployment or attempted deployment:

```md
Deployment evidence

Target: local | preview | production-web | production-api | auth-infra
Commit SHA:
Operator:
Auth mode: GitHub | gcloud browser auth | local only
Validation run:
- npm run test:
- npm run typecheck:
- npm run lint:
- npm run build:
- npm run architecture:check:
- npm run starter:version:check:
Deploy command or trigger:
Build ID or deployment ID:
Migration job execution:
Health check:
Readiness check:
Browser verification:
Rollback needed: yes | no
Notes:
```

Never include secret values, cookies, session IDs, DSNs, passwords, auth headers, or full user PII in deployment evidence.

## Known Gaps To Close

- No committed local `docker compose` file for Postgres, Kratos, and Mailpit. Local E2E is script-driven and persistent, but local service installation is still manual.
- No separate checked-in staging Terraform backend or staging `tfvars` file. Staging is specified here but not fully codified.
- No automated promotion workflow from staging to production. Promotion is manual and evidence-driven today.
- No formal release artifact policy that pins one image digest through staging and production.
- No formal database down-migration framework. Rollback relies on backward-compatible migrations, forward fixes, or restore-from-backup.
- No automated staging browser E2E suite for the hosted auth flow.
- No automated production smoke workflow that verifies web, API, Kratos public, Kratos admin privacy, and admin console in one command.
- Local Kratos registration produced an unverified email address during validation, but Mailpit received no verification message. The verified-email completion path still needs a local Kratos courier/config validation pass before claiming full local browser E2E.
- Kratos registration pre-hook allowlist enforcement is not fully wired; current implementation enforces eligibility during hosted session sync.
- Admin-triggered password reset depends on the configured Kratos admin recovery-link endpoint and has not been validated against local/staging/prod Kratos in this runbook.
- Vercel preview behavior for full auth E2E is not defined. Preview can render the app, but auth E2E requires a preview-safe Kratos callback and API target.
