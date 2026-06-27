#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-neutrino-491317}"

required=(
  OPENAI_API_KEY
  API_PROXY_SHARED_SECRET
  POSTGRES_APP_PASSWORD
  CORE_DATABASE_URL
  KRATOS_CONFIG_YAML
  KRATOS_IDENTITY_SCHEMA_JSON
  KRATOS_DSN
  KRATOS_SECRETS_DEFAULT
  KRATOS_SECRETS_COOKIE
  KRATOS_OIDC_PROVIDERS_JSON
  KRATOS_POSTGRES_PASSWORD
)

missing=0
for secret in "${required[@]}"; do
  if gcloud secrets versions list "${secret}" \
    --project="${PROJECT_ID}" \
    --limit=1 \
    --format="value(name)" | grep -q .; then
    echo "ok secret=${secret}"
  else
    echo "missing secret=${secret}" >&2
    missing=1
  fi
done

if [ "${missing}" != "0" ]; then
  echo "One or more required production secrets are missing versions in project ${PROJECT_ID}." >&2
  exit 1
fi

echo "Production secret version check passed for project ${PROJECT_ID}."
