# Deployment Baseline and Runbook

Operational issue history and recurring fixes are tracked in [docs/ops-known-issues.md](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/docs/ops-known-issues.md).

This document is both the human deployment runbook and the coding-agent operating guide. Deployment work should be possible from this repo after the operator has provided Google Cloud, GitHub, Vercel, and npm/auth access as needed.

## Source of Truth

- Web runtime: [apps/web](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/apps/web), deployed to Vercel.
- API runtime: [apps/api](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/apps/api), deployed to Cloud Run from [apps/api/Dockerfile](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/apps/api/Dockerfile).
- API deploy worker: [cloudbuild.yaml](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/cloudbuild.yaml).
- Google Cloud infrastructure: [infra/terraform/cloud-run](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/infra/terraform/cloud-run).
- Architecture contract: [architecture/contract.json](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/architecture/contract.json).
- Generated architecture doc: [docs/architecture-canonical.md](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/docs/architecture-canonical.md).
- Requirements and accepted constraints: [docs/requirements-baseline.md](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/docs/requirements-baseline.md).

Deployment-affecting architecture changes must update [architecture/contract.json](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/architecture/contract.json) first, then regenerate [docs/architecture-canonical.md](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/docs/architecture-canonical.md) with:

```sh
npm run architecture:render
```

## Deployment Model

- Pushes to `main` are the intended production deployment path.
- Vercel owns the frontend deploy for [apps/web](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/apps/web).
- Cloud Build owns the API image build and Cloud Run rollout.
- Terraform owns the Cloud Run service contract, migration job, secret bindings, resource limits, probes, ingress, IAM, and optional self-managed Postgres resources.
- Cloud Build should roll images forward only. Do not hand-configure Cloud Run environment variable names, probes, resource limits, or IAM in the console for normal operation.
- Secrets are intentionally outside git and must be created or rotated manually through Vercel and Google Secret Manager.

## Required Access

The coding agent can run the deploy process once these access requirements are satisfied:

- GitHub access to push or merge to `pico-dot-ai/neutrino`.
- Vercel access to the project connected to this repo.
- Google Cloud auth for project `neutrino-491317` or the selected target project.
- Terraform access to the GCS backend bucket `neutrino-terraform-state`.
- Permission to read/write Secret Manager secrets used by the API.
- Permission to trigger Cloud Build and update Cloud Run through the configured service account.

Useful auth/setup commands:

```sh
gcloud auth login
gcloud auth application-default login
gcloud config set project neutrino-491317
gcloud auth list
gcloud config list project
```

When running Terraform from Codex, provider-backed commands such as `terraform validate`, `terraform plan`, and `terraform apply` may require unsandboxed execution because the Google provider can use a local Unix socket for its plugin handshake.

## Pre-Deploy Validation

Run these before merging or triggering production deploys:

```sh
npm install
npm run test
npm run typecheck
npm run lint
npm run build
npm run architecture:check
npm run starter:version:check
```

API-specific checks before Cloud Build:

- Confirm [cloudbuild.yaml](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/cloudbuild.yaml) escapes Cloud Build shell variables as `$${...}` inside script steps.
- Confirm [apps/api/Dockerfile](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/apps/api/Dockerfile) copies workspace package manifests before `npm install` for every `@neutrino/*` dependency referenced by copied app manifests.
- Confirm the API bundle does not leave runtime imports to local workspace TypeScript source packages.
- Keep `/health`, `/readyz`, and `/v1/chat` available on deployable API builds. `/healthz` may remain as compatibility alias, but deployment gating uses `/health`.

## Environment Variables and Secrets

### Vercel Web

Set these in Vercel for the production web deployment:

- `API_BASE_URL`
- `API_PROXY_SHARED_SECRET`
- `APP_SESSION_SECRET`
- `APP_SESSION_TTL_SECONDS`
- `APP_IDENTITY_USERS_JSON`
- `APP_AUTH_ENABLED`
- `AUTH_PROVIDER`
- `AUTH_LOCAL_MODE`
- `ORY_KRATOS_PUBLIC_URL`
- `ORY_KRATOS_ADMIN_URL`
- `NEXT_PUBLIC_APP_NAME`

`API_BASE_URL` must be the root Cloud Run service URL only, for example:

```text
https://neutrino-api-xxxxx-uc.a.run.app
```

Do not set `API_BASE_URL` to a Cloud Console URL, a revision URL, or a URL that already includes `/v1/chat`.

For Kratos-backed production auth:

- `AUTH_PROVIDER=ory-kratos`
- `AUTH_LOCAL_MODE=emergency` (fallback posture only)
- `ORY_KRATOS_PUBLIC_URL=https://auth.pico.ai`
- `ORY_KRATOS_ADMIN_URL=<internal-admin-url>`

Kratos identity data policy for this repo:

- Kratos owns authentication, identity profile data, and browser sessions.
- `traits.email` is the password-login identifier.
- Neutrino does not consume Kratos groups, roles, grants, permissions, or app authorization state.
- Kratos identity schemas must not define or retain `traits.groups` or `metadata_public.groups`.

`APP_IDENTITY_USERS_JSON` is required only when `AUTH_PROVIDER=local`. The development-only `admin` fallback is intentionally disabled when `NODE_ENV=production`. Use this JSON shape only for local fallback mode:

```json
[
  {
    "username": "admin",
    "password": "replace-with-a-strong-password",
    "email": "admin@pico.ai"
  }
]
```

`APP_SESSION_SECRET` must be a strong random string. Do not expose `OPENAI_API_KEY` to Vercel; only the Cloud Run API should have it.

Vercel CLI checks:

```sh
vercel env ls
vercel deploy --prod
vercel ls
```

If GitHub-to-Vercel auto deploy is configured, pushing or merging to the production branch should be enough. Use the Vercel dashboard or `vercel ls` to confirm the production deployment.

### Auth Direction

- The product auth surface should be hosted under `auth.pico.ai`.
- The production auth model must use a real login page, not HTTP Basic Auth.
- Ory/Kratos is the accepted authentication and session-management target.
- Ory/Kratos is implemented through Cloud Run services and migration/bootstrap jobs in this repo.
- Local username/password auth remains only as a development, bootstrap, and emergency fallback under `AUTH_PROVIDER=local`.
- Auth must stay behind provider ports and adapters while the backing implementation moves to Ory/Kratos.
- SSO is planned through identity, authenticator, and directory provider ports rather than feature-code rewrites.
- Session-backed access must protect Admin Console and builder surfaces.
- OpenFGA is the accepted durable runtime authorization model behind `PolicyEngine`.
- Ory Keto/Permissions is a related Zanzibar-style option, but it is not the selected runtime authorization engine.
- Permission builder UX is deferred; future builder forms must project to OpenFGA models and relationship tuples.

### Google Secret Manager

The API requires these Secret Manager secrets in the target GCP project:

- `OPENAI_API_KEY`
- `API_PROXY_SHARED_SECRET`
- `POSTGRES_APP_PASSWORD`
- `CORE_DATABASE_URL`
- `KRATOS_CONFIG_YAML`
- `KRATOS_IDENTITY_SCHEMA_JSON`
- `KRATOS_DSN`
- `KRATOS_SECRETS_DEFAULT`
- `KRATOS_SECRETS_COOKIE`
- `KRATOS_OIDC_PROVIDERS_JSON`
- `KRATOS_POSTGRES_PASSWORD`

Create secrets when missing:

```sh
gcloud secrets create OPENAI_API_KEY --replication-policy=automatic
gcloud secrets create API_PROXY_SHARED_SECRET --replication-policy=automatic
gcloud secrets create POSTGRES_APP_PASSWORD --replication-policy=automatic
gcloud secrets create CORE_DATABASE_URL --replication-policy=automatic
gcloud secrets create KRATOS_CONFIG_YAML --replication-policy=automatic
gcloud secrets create KRATOS_IDENTITY_SCHEMA_JSON --replication-policy=automatic
gcloud secrets create KRATOS_DSN --replication-policy=automatic
gcloud secrets create KRATOS_SECRETS_DEFAULT --replication-policy=automatic
gcloud secrets create KRATOS_SECRETS_COOKIE --replication-policy=automatic
gcloud secrets create KRATOS_OIDC_PROVIDERS_JSON --replication-policy=automatic
gcloud secrets create KRATOS_POSTGRES_PASSWORD --replication-policy=automatic
```

Add or rotate secret values:

```sh
printf '%s' '<openai-api-key>' | gcloud secrets versions add OPENAI_API_KEY --data-file=-
printf '%s' '<shared-proxy-secret>' | gcloud secrets versions add API_PROXY_SHARED_SECRET --data-file=-
printf '%s' '<postgres-password>' | gcloud secrets versions add POSTGRES_APP_PASSWORD --data-file=-
printf '%s' '<postgres-connection-url>' | gcloud secrets versions add CORE_DATABASE_URL --data-file=-
```

Terraform creates the `POSTGRES_APP_PASSWORD` secret metadata when self-managed Postgres is enabled, but the secret value must be added outside Terraform so it is not written into Terraform state.

Kratos secret lifecycle from repo:

```sh
export PROJECT_ID=neutrino-491317
scripts/kratos-secrets-upsert.sh
scripts/kratos-validate-secrets.sh
```

## Terraform Infrastructure

[infra/terraform/cloud-run/main.tf](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/infra/terraform/cloud-run/main.tf) is the source of truth for:

- Cloud Run service settings.
- Cloud Run migration job `${service_name}-core-migrate`.
- Cloud Run migration and bootstrap jobs for Kratos (`kratos_migrate_job_name`, `kratos_db_bootstrap_job_name`).
- Cloud Run services for Kratos public and admin endpoints.
- Secret Manager bindings.
- Runtime service account.
- CPU, memory, timeout, scaling, startup probe, ingress, and invoker IAM settings.
- Optional self-managed Postgres VM, disk, firewall, and VPC connector resources.
- Optional Cloud Build GitHub trigger.

Terraform state for this module must use the shared GCS backend in [infra/terraform/cloud-run/backend.tf](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/infra/terraform/cloud-run/backend.tf):

- bucket: `neutrino-terraform-state`
- prefix: `cloud-run/prod`

One-time backend setup:

```sh
gcloud storage buckets create gs://neutrino-terraform-state --project=neutrino-491317 --location=us-central1 --uniform-bucket-level-access --public-access-prevention
gcloud storage buckets update gs://neutrino-terraform-state --versioning
gcloud storage ls gs://neutrino-terraform-state
```

Initialize and apply:

```sh
cd infra/terraform/cloud-run
terraform init
terraform validate
terraform plan -out=tfplan
terraform apply tfplan
terraform output
```

If migrating existing local state to GCS:

```sh
cd infra/terraform/cloud-run
terraform init -migrate-state
gcloud storage ls gs://neutrino-terraform-state/cloud-run/prod
```

If the Cloud Run service already exists and is not in Terraform state, import it before applying:

```sh
cd infra/terraform/cloud-run
terraform import google_cloud_run_v2_service.api projects/PROJECT_ID/locations/us-central1/services/neutrino-api
```

Use [infra/terraform/cloud-run/terraform.tfvars.example](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/infra/terraform/cloud-run/terraform.tfvars.example) as the starting point for variables.

Kratos rollout execution:

```sh
export PROJECT_ID=neutrino-491317
export REGION=us-central1
scripts/kratos-deploy-gcp.sh
```

This script applies Terraform, bootstraps the Kratos database/user on the existing Postgres VM, runs `kratos migrate sql`, and prints Kratos public/admin service URLs.

Map `auth.pico.ai` to Kratos public service:

```sh
gcloud run domain-mappings create \
  --service neutrino-kratos-public \
  --domain auth.pico.ai \
  --region us-central1 \
  --project neutrino-491317

gcloud run domain-mappings describe \
  --domain auth.pico.ai \
  --region us-central1 \
  --project neutrino-491317
```

## Cloud Run API Deployment

The API container is built from the repository root, not from [apps/api](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/apps/api), because the Dockerfile copies workspace files from the monorepo root.

Cloud Build does this sequence:

1. Build image from [apps/api/Dockerfile](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/apps/api/Dockerfile).
2. Push image to Artifact Registry.
3. Update the Cloud Run migration job to the new image.
4. Execute the migration job and wait for completion.
5. Update the Cloud Run service to the new image.
6. Read the service URL.
7. Verify `GET /health`.

Required Cloud Build trigger substitutions:

- `_AR_HOSTNAME=us-central1-docker.pkg.dev`
- `_AR_REPOSITORY=cloud-run-source-deploy`
- `_IMAGE_NAME=neutrino-api`
- `_SERVICE_NAME=neutrino-api`
- `_MIGRATION_JOB=neutrino-api-core-migrate`
- `_DEPLOY_REGION=us-central1`

The Terraform-managed v2 trigger (`neutrino-api-main-deploy`) watches pushes to `main` on `pico-dot-ai/neutrino` when `enable_github_deploy_trigger = true`. It uses repository events from `projects/neutrino-491317/locations/us-central1/connections/neutrino-github/repositories/neutrino`. Its file filter must include API source, shared packages, migrations, workspace manifests, TypeScript config, and [cloudbuild.yaml](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/cloudbuild.yaml).

Manual Cloud Build deploy from the current checkout:

```sh
gcloud builds submit . \
  --config=cloudbuild.yaml \
  --substitutions=_AR_HOSTNAME=us-central1-docker.pkg.dev,_AR_REPOSITORY=cloud-run-source-deploy,_IMAGE_NAME=neutrino-api,_SERVICE_NAME=neutrino-api,_MIGRATION_JOB=neutrino-api-core-migrate,_DEPLOY_REGION=us-central1
```

Manual trigger run:

```sh
gcloud builds triggers list --region=us-central1
gcloud builds triggers run neutrino-api-main-deploy --region=us-central1 --branch=main
```

The Cloud Build service account must be able to build and push to Artifact Registry, update Cloud Run, execute Cloud Run jobs, read Secret Manager values through runtime bindings, and act as the Cloud Run runtime service account if a non-default runtime service account is configured.

## Data Platform

Hosted Postgres is the durable system of record target. The current deployment keeps one self-managed Postgres VM on Compute Engine, but it must run in private networking mode when Kratos public auth endpoints are exposed to the internet.

Current self-managed modes:

- `prototype`: lower-cost development mode. VM gets a public IP and ingress firewall for `5432` using `postgres_public_allowed_cidrs`; no Serverless VPC Access connector or Cloud NAT is provisioned.
- `hardened`: private mode. VM stays private, Cloud Run reaches it through Serverless VPC Access, and Cloud NAT is provisioned for VM bootstrap egress.

For Kratos public internet exposure, use this Terraform setting:

```hcl
postgres_deployment_mode = "hardened"
```

The Postgres VM uses:

- image: `pgvector/pgvector:pg17`
- database: `platform_prod`
- user: `platform_user`
- password secret: `POSTGRES_APP_PASSWORD`
- data disk: Terraform-managed persistent disk with destroy prevention
- private host: Terraform output `postgres_internal_ip`
- public host in prototype mode: Terraform output `postgres_public_ip` (do not use for customer-facing auth deployments)

The deployed `CORE_DATABASE_URL` shape is:

```text
prototype: postgresql://platform_user:<POSTGRES_APP_PASSWORD>@<postgres_public_ip>:5432/platform_prod?sslmode=disable
hardened:  postgresql://platform_user:<POSTGRES_APP_PASSWORD>@<postgres_internal_ip>:5432/platform_prod?sslmode=disable
```

Required controls before relying on this database for production data:

- Separate staging and production databases.
- Backup automation plus at least one restore verification run.
- Migration promotion flow: staging migrate, validate, production backup, production migrate.
- Documented rollback/runbook for failed or partial migrations.
- Postgres `5432` is not publicly reachable from the internet.
- `CORE_DATABASE_URL` and `KRATOS_DSN` resolve to private DB connectivity.
- Kratos public endpoint may be internet-accessible; Kratos admin and Postgres must remain private.

Keep runtime DB configuration fully environment-driven through `CORE_DATABASE_URL` or `DATABASE_URL`.

Internal alpha migration gate:

1. Load local env and migrate the dedicated test database:
   `set -a; . ./.env; set +a; CORE_DATABASE_URL="$CORE_TEST_DATABASE_URL" npm run migrate --workspace @neutrino/core`
2. Run durable repository validation:
   `npm run test:core:postgres`
3. Validate the normal code gates:
   `npm run typecheck`, `npm test -- --run`, and `npm run architecture:check`
4. Confirm live infrastructure shape:
   `terraform output` from `infra/terraform/cloud-run`
5. Confirm the production secret exists without printing it:
   `gcloud secrets versions describe latest --secret=CORE_DATABASE_URL --project=neutrino-491317`
6. Execute and verify the migration job:
   `gcloud run jobs execute neutrino-api-core-migrate --region=us-central1 --project=neutrino-491317 --wait`
7. Confirm recent migration execution status:
   `gcloud run jobs executions list --job=neutrino-api-core-migrate --region=us-central1 --project=neutrino-491317 --limit=5`
8. Confirm API readiness:
   `gcloud run services describe neutrino-api --region=us-central1 --project=neutrino-491317` and `curl -i <service-url>/readyz`

Do not run integration-test writes against `platform_prod`; use `CORE_TEST_DATABASE_URL` and a dedicated test database such as `platform_test`.

### Phase 2 Closure Drill Command

Use one command for the backup/restore + migration-promotion drill:

```sh
npm run phase2:drill
```

Required environment variables before running:

```sh
export CORE_PHASE2_MAINTENANCE_DATABASE_URL="postgresql://platform_user:<password>@<host>:5432/postgres?sslmode=disable"
export CORE_PHASE2_STAGE_DATABASE_URL="postgresql://platform_user:<password>@<host>:5432/platform_phase2_stage?sslmode=disable"
export CORE_PHASE2_RESTORE_DATABASE_URL="postgresql://platform_user:<password>@<host>:5432/platform_phase2_restore?sslmode=disable"
export CORE_PHASE2_STAGE_DB_NAME="platform_phase2_stage"
export CORE_PHASE2_RESTORE_DB_NAME="platform_phase2_restore"
```

Expected success output includes:

- `phase2_drill:success`
- `probe_count=1`
- `stage_migration=pending: 0`
- `restore_migration=pending: 0`

Drill script source: [scripts/phase2-core-persistence-drill.sh](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/scripts/phase2-core-persistence-drill.sh)

### Phase 2 Evidence Record

Record these fields in Linear ticket `THU-19` and keep this file updated:

- UTC run timestamp
- stage and restore database names
- backup artifact path
- probe ID and probe count
- stage migration status summary
- restore migration status summary
- readiness check result (`/readyz`)
- operator initials

Phase 2 is complete only after one successful drill evidence record is attached.

Latest evidence record:

- UTC run timestamp: `2026-05-24T16:58:08Z`
- stage database: `platform_phase2_stage`
- restore database: `platform_phase2_restore`
- backup artifact: `/tmp/platform_phase2_stage-20260524T165808Z.dump`
- probe ID: `phase2-probe-20260524T165808Z`
- probe count: `1`
- stage migration status: `pending: 0`
- restore migration status: `pending: 0`
- readiness check: `curl -i https://neutrino-api-jeo3uupuxa-uc.a.run.app/readyz` returned HTTP `200` with `{"status":"ready"}`
- operator: `kevin@pico.ai` (Codex-assisted execution)

## Blob and Artifact Storage

Blob/artifact storage is part of the platform deployment boundary even though the first deploy path may use local development backing.

- Postgres stores artifact metadata, references, permissions, provenance, checksums, and retention state.
- ObjectStorage stores original bytes and generated binary assets, including small images, thumbnails, exports, eval datasets, trace attachments, generated files, and uploaded documents.
- The first development backing can be local filesystem or local object storage, but the port should match production object storage semantics.
- Production backing should remain swappable among S3-compatible storage, GCS, R2, or equivalent object stores.
- When production object storage is selected, document provider setup, bucket/container names, IAM, secrets, lifecycle policy, backup/export assumptions, and verification commands in this file.

Current GCP baseline for internal alpha:

- Terraform manages a dedicated artifact bucket (`artifact_bucket_name`) with uniform bucket-level access and public access prevention enforced.
- Cloud Run service and migration job receive:
  - `OBJECT_STORAGE_PROVIDER`
  - `OBJECT_STORAGE_GCS_BUCKET`
  - `OBJECT_STORAGE_GCS_PREFIX`
- Runtime service account receives `roles/storage.objectAdmin` on the artifact bucket.

Verification commands:

```sh
terraform output artifact_bucket_name artifact_bucket_url
gcloud storage ls gs://$(terraform output -raw artifact_bucket_name)
gcloud run services describe neutrino-api --region=us-central1 --project=neutrino-491317
```

## Web Deployment

The Vercel production project must build [apps/web](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/apps/web) from this monorepo. The expected build remains the workspace build for `@neutrino/web`:

```sh
npm run build --workspace @neutrino/web
```

Before promoting a web deployment:

- Confirm Vercel production env vars are present.
- Confirm `API_BASE_URL` points to the root Cloud Run service URL.
- Confirm `API_PROXY_SHARED_SECRET` matches the Cloud Run secret value.
- Confirm `AUTH_PROVIDER=ory-kratos` for production.
- Confirm `APP_SESSION_SECRET` is set and strong.

Production verification:

- Vercel deployment is marked `Ready`.
- `/login` renders.
- Kratos admin user can log in.
- Authenticated admin routes load.
- The chat path reaches Cloud Run through the Next.js API proxy.

## Post-Deploy Verification

After every API deploy, verify the deployed service directly:

```sh
SERVICE_URL="$(gcloud run services describe neutrino-api --region=us-central1 --format='value(status.url)')"
curl -fsS "$SERVICE_URL/health"
curl -fsS "$SERVICE_URL/readyz"
```

Verify the active revision and image:

```sh
gcloud run services describe neutrino-api --region=us-central1 --format='value(status.latestReadyRevisionName,status.latestCreatedRevisionName)'
gcloud run revisions list --service=neutrino-api --region=us-central1 --limit=5
```

Verify the migration job:

```sh
gcloud run jobs describe neutrino-api-core-migrate --region=us-central1
gcloud run jobs executions list --job=neutrino-api-core-migrate --region=us-central1 --limit=5
```

Verify Cloud Build:

```sh
gcloud builds list --region=us-central1 --limit=5
gcloud builds log BUILD_ID --region=us-central1
```

Verify the protected chat endpoint with the same shared secret configured in Vercel and Secret Manager:

```sh
curl -i "$SERVICE_URL/v1/chat" \
  -H "content-type: application/json" \
  -H "x-api-proxy-secret: <shared-proxy-secret>" \
  --data '{"messages":[{"role":"user","content":"health check"}]}'
```

The expected result is a successful streaming or JSON response from the API. A `401` usually means `API_PROXY_SHARED_SECRET` mismatch. A `404` from the web proxy usually means `API_BASE_URL` includes the wrong path. A Cloud Run revision failure usually means startup, env var, secret binding, or bundle/runtime dependency failure.

After every web deploy, verify the user-facing path:

```sh
vercel ls
```

Then use the Codex in-app browser by default to check:

- production `/login`
- successful admin login
- authenticated admin console route
- chat request through the web app to the API

Use the system browser only if the in-app browser is unavailable or blocked.

## Manual Operations That Remain

These still require explicit operator or agent action:

- Google Cloud login and project selection.
- Initial Cloud Build GitHub App or repository connection.
- Initial GCS Terraform backend bucket creation.
- Terraform state migration from local state to GCS, if not already complete.
- Terraform import for pre-existing Cloud Run resources.
- Secret creation and rotation in Google Secret Manager.
- Vercel environment variable creation and rotation.
- Vercel project setup or correction if GitHub auto deploy is not connected.
- Manual Cloud Build trigger runs when not deploying by push to `main`.
- Database backup/restore verification before treating data as production-critical.

## Agent Checklist

For a normal deployment change, the coding agent should:

1. Identify whether the change affects architecture, infra, API runtime, web runtime, or secrets.
2. Update [architecture/contract.json](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/architecture/contract.json) and regenerate docs only for architecture-affecting changes.
3. Update [docs/deployment-baseline.md](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/docs/deployment-baseline.md), [docs/ops-known-issues.md](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/docs/ops-known-issues.md), or Terraform docs when deployment behavior changes.
4. Run pre-deploy validation.
5. Apply Terraform when service contract or infrastructure changes.
6. Confirm required secrets exist and have current values.
7. Trigger deploy through GitHub push, Cloud Build trigger, or Vercel production deploy.
8. Run post-deploy API and web verification.
9. Record recurring failures in [docs/ops-known-issues.md](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/docs/ops-known-issues.md) with symptom, root cause, fix, prevention, and verification.
