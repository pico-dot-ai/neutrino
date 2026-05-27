#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-}"
if [ -z "${PROJECT_ID}" ]; then
  echo "Missing PROJECT_ID." >&2
  exit 1
fi

required=(
  KRATOS_CONFIG_YAML
  KRATOS_IDENTITY_SCHEMA_JSON
  KRATOS_DSN
  KRATOS_SECRETS_DEFAULT
  KRATOS_SECRETS_COOKIE
  KRATOS_OIDC_PROVIDERS_JSON
  KRATOS_POSTGRES_PASSWORD
)

for secret in "${required[@]}"; do
  gcloud secrets versions access latest \
    --project "${PROJECT_ID}" \
    --secret "${secret}" >/dev/null
done

gcloud secrets versions access latest --project "${PROJECT_ID}" --secret KRATOS_OIDC_PROVIDERS_JSON \
  | jq -e . >/dev/null

echo "Kratos secrets validated in project ${PROJECT_ID}."
