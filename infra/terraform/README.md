# Terraform Infra

Infrastructure-as-code boundary.

Current baseline:
- `cloud-run/`: Google Cloud Run service for `apps/api`

The API container is designed to stay portable to App Runner by keeping the runtime contract simple:
- single Docker image
- `PORT`-driven startup
- `/healthz` and `/readyz`
- stateless request handling
