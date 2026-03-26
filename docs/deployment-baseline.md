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

## API
- Build the container from [apps/api/Dockerfile](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/apps/api/Dockerfile).
- When using Cloud Build, the build context must be the repository root, not `apps/api`, because the Dockerfile copies workspace files from the monorepo root.
- The included [cloudbuild.yaml](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/cloudbuild.yaml) does this with `docker build -f apps/api/Dockerfile .` and then deploys the built image to Cloud Run.
- Deploy to Cloud Run using [infra/terraform/cloud-run/main.tf](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/infra/terraform/cloud-run/main.tf).
- Provide secrets for:
  - `OPENAI_API_KEY`
  - `API_PROXY_SHARED_SECRET`

## OpenAI Key Location
- Use the standard `OPENAI_API_KEY` environment variable.
- In Google Cloud Run, store it in Secret Manager and mount it into the service environment through Terraform.
- In Vercel, do not expose the OpenAI key; only the Cloud Run backend should have it.
