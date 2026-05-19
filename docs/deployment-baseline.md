# Deployment Baseline

Operational issue history and recurring fixes are tracked in [docs/ops-known-issues.md](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/docs/ops-known-issues.md).

## Web
- Deploy [apps/web](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/apps/web) to Vercel.
- Configure:
  - `API_BASE_URL`
  - `API_PROXY_SHARED_SECRET`
  - `APP_SESSION_SECRET`
  - `APP_SESSION_TTL_SECONDS`
  - `APP_IDENTITY_USERS_JSON`
  - `APP_AUTH_ENABLED`
  - `NEXT_PUBLIC_APP_NAME`
- `API_BASE_URL` must be the root Cloud Run service URL only, for example `https://neutrino-api-xxxxx-uc.a.run.app`
- Do not set `API_BASE_URL` to:
  - a Cloud Console URL
  - a revision URL path
  - a URL that already includes `/v1/chat`

## Auth
- The product auth surface should be hosted under `auth.pico.ai`.
- The product auth model must use a real login page, not HTTP Basic Auth.
- The first implementation may use local username/password auth for development and early internal usage.
- Production web deployments must define `APP_IDENTITY_USERS_JSON`; the development-only `admin` fallback is intentionally disabled when `NODE_ENV=production`.
- `APP_IDENTITY_USERS_JSON` must be a JSON array with this shape:
  ```json
  [
    {
      "username": "admin",
      "password": "replace-with-a-strong-password",
      "email": "admin@pico.ai",
      "orgMemberships": ["picoai"],
      "roles": ["app_admin", "org_admin"]
    }
  ]
  ```
- `APP_SESSION_SECRET` must also be set to a strong random string in production.
- Auth must stay behind provider ports and adapters so the backing implementation can move to Ory Kratos.
- SSO is planned through identity, authenticator, directory, and policy provider ports rather than feature-code rewrites.
- Session-backed access must protect Admin Console and builder surfaces.

## API
- Preflight checks before triggering deploy:
  - Confirm `cloudbuild.yaml` shell variables are escaped as `$${...}` when used inside script steps.
  - Confirm pre-install workspace `package.json` copies in [apps/api/Dockerfile](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/apps/api/Dockerfile) include all `@neutrino/*` dependencies referenced by copied app manifests.
  - Confirm API bundle strategy does not leave runtime imports to local workspace TS source packages.
- Build the container from [apps/api/Dockerfile](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/apps/api/Dockerfile).
- When using Cloud Build, the build context must be the repository root, not `apps/api`, because the Dockerfile copies workspace files from the monorepo root.
- The included [cloudbuild.yaml](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/cloudbuild.yaml) builds, pushes, updates the existing Cloud Run service image, and then verifies `/healthz`.
- Terraform in [infra/terraform/cloud-run/main.tf](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/infra/terraform/cloud-run/main.tf) is the source of truth for the Cloud Run service contract:
  - exact env var names
  - Secret Manager bindings
  - resource limits
  - probes
  - ingress
  - public invoker IAM
- Terraform state for the Cloud Run module must use the shared GCS backend in [infra/terraform/cloud-run/backend.tf](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/infra/terraform/cloud-run/backend.tf):
  - bucket: `neutrino-terraform-state`
  - prefix: `cloud-run/prod`
- Cloud Build is not the place to create or hand-configure runtime env vars anymore. It should only roll the image forward on an existing service.
- Provide secrets in Secret Manager for:
  - `OPENAI_API_KEY`
  - `API_PROXY_SHARED_SECRET`
  - `CORE_DATABASE_URL`
  - `POSTGRES_APP_PASSWORD`
- `CORE_DATABASE_URL` should be a full Postgres connection string for the target environment database.
- Terraform now manages a Cloud Run migration job (`${service_name}-core-migrate`) and Cloud Build runs it with the just-built image before updating the API service.
- Apply Terraform once before using the Cloud Build trigger continuously.
- If the service already exists, import it into Terraform state first instead of recreating it.
- Use [infra/terraform/cloud-run/terraform.tfvars.example](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/infra/terraform/cloud-run/terraform.tfvars.example) as the starting point for variables.
- One-time backend bootstrap and migration flow:
  - create the GCS bucket `neutrino-terraform-state` in project `neutrino-491317`
  - enable uniform bucket-level access, public access prevention, and versioning
  - grant bucket object read/write access to each operator or CI identity that will run Terraform
  - run `terraform init -migrate-state` from [infra/terraform/cloud-run](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/infra/terraform/cloud-run)
  - verify the migrated state object exists under `gs://neutrino-terraform-state/cloud-run/prod`
  - after migration, treat the GCS backend as canonical and do not rely on local state files
- When running Terraform from Codex, provider-backed commands such as `terraform validate`,
  `terraform plan`, and `terraform apply` may require unsandboxed execution because the Google
  provider uses a local Unix socket for its plugin handshake.
- Cloud Build trigger substitutions should be plain values, not nested image strings. Use:
  - `_AR_HOSTNAME=us-central1-docker.pkg.dev`
  - `_AR_REPOSITORY=cloud-run-source-deploy`
  - `_IMAGE_NAME=neutrino-api`
  - `_SERVICE_NAME=neutrino-api`
  - `_MIGRATION_JOB=neutrino-api-core-migrate`
  - `_DEPLOY_REGION=us-central1`
- Backend deployment from GitHub should use the Terraform-managed Cloud Build trigger in [infra/terraform/cloud-run/main.tf](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/infra/terraform/cloud-run/main.tf), enabled with `enable_github_deploy_trigger = true`.
- The trigger watches pushes to `main` on `pico-dot-ai/neutrino` and runs [cloudbuild.yaml](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/cloudbuild.yaml).
- The Cloud Build GitHub App or Cloud Build repository connection must be connected to the GitHub repo once before Terraform can create or use the trigger.
- The Cloud Build service account must be able to:
  - build and push to Artifact Registry
  - update the Cloud Run service
  - act as the Cloud Run runtime service account, if a non-default runtime service account is configured
- Import command for an existing service:
  - `terraform import google_cloud_run_v2_service.api projects/PROJECT_ID/locations/us-central1/services/neutrino-api`

## Data Platform
- Hosted Postgres is part of the first serious implementation plan and is the durable system of record for platform metadata and canonical records.
- pgvector should be installed with Postgres for the first vector/retrieval implementation.
- pgvector is the initial vector implementation, not a permanent platform assumption.
- Vector and retrieval access must stay behind replaceable ports so Qdrant, Pinecone, object storage indexes, or external retrieval APIs can be introduced later.
- Database schema changes must be explicit, versioned migrations.
- Temporary prototype profile: self-managed Postgres is acceptable while proving platform concepts, provided rollout safety controls are in place.
- The self-managed prototype database runs on a Terraform-managed Compute Engine VM, not inside Cloud Run.
- Cloud Run remains the stateless API runtime and reaches the database through a Serverless VPC Access connector.
- The private Postgres VM uses Cloud NAT for outbound package/image downloads during bootstrap.
- The Postgres VM uses:
  - image: `pgvector/pgvector:pg17`
  - database: `platform_prod`
  - user: `platform_user`
  - password secret: `POSTGRES_APP_PASSWORD`
  - data disk: Terraform-managed persistent disk with destroy prevention
  - private host: Terraform output `postgres_internal_ip`
- The deployed `CORE_DATABASE_URL` shape is:
  ```text
  postgresql://platform_user:<POSTGRES_APP_PASSWORD>@<postgres_internal_ip>:5432/platform_prod?sslmode=disable
  ```
- Required controls for the self-managed prototype profile:
  - separate staging and production databases
  - backup automation plus at least one restore verification run
  - migration promotion flow: staging migrate -> validate -> production backup -> production migrate
  - documented rollback/runbook for failed or partial migrations
- Keep runtime DB configuration fully environment-driven through `CORE_DATABASE_URL` or `DATABASE_URL` to preserve a clean path to managed Postgres later.

## Blob and Artifact Storage
- Blob/artifact storage is required as a platform service boundary.
- Postgres stores artifact metadata, references, permissions, provenance, checksums, and retention state.
- ObjectStorage stores original bytes and generated binary assets, including small images, thumbnails, exports, eval datasets, trace attachments, generated files, and uploaded documents.
- The first development backing can be local filesystem or local object storage, but the port should match production object storage semantics.
- Production backing should remain swappable among S3-compatible storage, GCS, R2, or equivalent object stores.

## OpenAI Key Location
- Use the standard `OPENAI_API_KEY` environment variable.
- In Google Cloud Run, store it in Secret Manager and mount it into the service environment through Terraform with env names exactly `OPENAI_API_KEY` and `API_PROXY_SHARED_SECRET`.
- In Vercel, do not expose the OpenAI key; only the Cloud Run backend should have it.

## Remaining Manual Google Cloud Step
- Before the deploy pipeline can run end-to-end, create and populate these Secret Manager secrets in the target GCP project:
  - `OPENAI_API_KEY`
  - `API_PROXY_SHARED_SECRET`
  - `POSTGRES_APP_PASSWORD`
  - `CORE_DATABASE_URL`
- `POSTGRES_APP_PASSWORD` must exist before the self-managed Postgres VM can initialize successfully.
- Terraform creates the `POSTGRES_APP_PASSWORD` secret metadata only; add the secret value as a Secret Manager version outside Terraform so the password is not written into Terraform state.
- `CORE_DATABASE_URL` is created after Terraform reports `postgres_internal_ip`, because that private IP is part of the connection string.
- No further code changes are required for secret wiring after those secrets exist with current values.
