#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-}"
REGION="${REGION:-us-central1}"
TF_DIR="${TF_DIR:-infra/terraform/cloud-run}"
KRATOS_DB_BOOTSTRAP_JOB_NAME="${KRATOS_DB_BOOTSTRAP_JOB_NAME:-neutrino-kratos-db-bootstrap}"
KRATOS_MIGRATE_JOB_NAME="${KRATOS_MIGRATE_JOB_NAME:-neutrino-kratos-migrate}"
KRATOS_PUBLIC_SERVICE_NAME="${KRATOS_PUBLIC_SERVICE_NAME:-neutrino-kratos-public}"
KRATOS_ADMIN_SERVICE_NAME="${KRATOS_ADMIN_SERVICE_NAME:-neutrino-kratos-admin}"

if [ -z "${PROJECT_ID}" ]; then
  echo "Missing PROJECT_ID." >&2
  exit 1
fi

gcloud config set project "${PROJECT_ID}" >/dev/null

(
  cd "${TF_DIR}"
  terraform init
  terraform validate
  terraform plan -out=tfplan
  terraform apply tfplan
)

gcloud run jobs execute "${KRATOS_DB_BOOTSTRAP_JOB_NAME}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --wait

gcloud run jobs execute "${KRATOS_MIGRATE_JOB_NAME}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --wait

gcloud run services describe "${KRATOS_PUBLIC_SERVICE_NAME}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --format='value(status.url)'

gcloud run services describe "${KRATOS_ADMIN_SERVICE_NAME}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --format='value(status.url)'

echo "Kratos infra apply + bootstrap + migrate complete."
