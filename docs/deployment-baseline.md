# Deployment Baseline

## Web
- Deploy [apps/web](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/apps/web) to Vercel.
- Configure:
  - `API_BASE_URL`
  - `API_PROXY_SHARED_SECRET`
  - `APP_GATE_USERNAME`
  - `APP_GATE_PASSWORD`
  - `NEXT_PUBLIC_API_GATE_ENABLED`
  - `NEXT_PUBLIC_APP_NAME`
- `API_BASE_URL` must be the root Cloud Run service URL only, for example `https://neutrino-api-xxxxx-uc.a.run.app`
- Do not set `API_BASE_URL` to:
  - a Cloud Console URL
  - a revision URL path
  - a URL that already includes `/v1/chat`

## API
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
  - `_DEPLOY_REGION=us-central1`
- Import command for an existing service:
  - `terraform import google_cloud_run_v2_service.api projects/PROJECT_ID/locations/us-central1/services/neutrino-api`

## OpenAI Key Location
- Use the standard `OPENAI_API_KEY` environment variable.
- In Google Cloud Run, store it in Secret Manager and mount it into the service environment through Terraform with env names exactly `OPENAI_API_KEY` and `API_PROXY_SHARED_SECRET`.
- In Vercel, do not expose the OpenAI key; only the Cloud Run backend should have it.
