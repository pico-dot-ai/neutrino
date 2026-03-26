# Terraform Infra

Infrastructure-as-code boundary.

Current baseline:
- `cloud-run/`: Google Cloud Run service for `apps/api`

The API container is designed to stay portable to App Runner by keeping the runtime contract simple:
- single Docker image
- `PORT`-driven startup
- `/healthz` and `/readyz`
- stateless request handling

Terraform state for live infrastructure must use the shared GCS backend configured in
[`cloud-run/backend.tf`](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/infra/terraform/cloud-run/backend.tf).
Do not rely on local `terraform.tfstate` for the Cloud Run module after migration.
