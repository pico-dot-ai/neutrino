#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-}"
KRATOS_CONFIG_FILE="${KRATOS_CONFIG_FILE:-}"
KRATOS_IDENTITY_SCHEMA_FILE="${KRATOS_IDENTITY_SCHEMA_FILE:-infra/kratos/identity.schema.json}"
KRATOS_OIDC_PROVIDERS_FILE="${KRATOS_OIDC_PROVIDERS_FILE:-infra/kratos/oidc.providers.json}"

if [ -z "${PROJECT_ID}" ]; then
  echo "Missing PROJECT_ID." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

tmp_config_file=""
if [ -z "${KRATOS_CONFIG_FILE}" ]; then
  tmp_config_file="$(mktemp /tmp/kratos.config.rendered.XXXXXX.yml)"
  "${REPO_ROOT}/scripts/kratos-render-config.sh" "${tmp_config_file}" >/dev/null
  KRATOS_CONFIG_FILE="${tmp_config_file}"
fi

cleanup() {
  if [ -n "${tmp_config_file}" ] && [ -f "${tmp_config_file}" ]; then
    rm -f "${tmp_config_file}"
  fi
}
trap cleanup EXIT

declare -a secrets=(
  KRATOS_CONFIG_YAML
  KRATOS_IDENTITY_SCHEMA_JSON
  KRATOS_DSN
  KRATOS_SECRETS_DEFAULT
  KRATOS_SECRETS_COOKIE
  KRATOS_OIDC_PROVIDERS_JSON
  KRATOS_POSTGRES_PASSWORD
)

for secret in "${secrets[@]}"; do
  if ! gcloud secrets describe "${secret}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
    gcloud secrets create "${secret}" --project "${PROJECT_ID}" --replication-policy=automatic >/dev/null
  fi
done

gcloud secrets versions add KRATOS_CONFIG_YAML --project "${PROJECT_ID}" --data-file="${KRATOS_CONFIG_FILE}" >/dev/null
gcloud secrets versions add KRATOS_IDENTITY_SCHEMA_JSON --project "${PROJECT_ID}" --data-file="${KRATOS_IDENTITY_SCHEMA_FILE}" >/dev/null
gcloud secrets versions add KRATOS_OIDC_PROVIDERS_JSON --project "${PROJECT_ID}" --data-file="${KRATOS_OIDC_PROVIDERS_FILE}" >/dev/null
printf '%s' "${KRATOS_DSN}" | gcloud secrets versions add KRATOS_DSN --project "${PROJECT_ID}" --data-file=- >/dev/null
printf '%s' "${KRATOS_SECRETS_DEFAULT}" | gcloud secrets versions add KRATOS_SECRETS_DEFAULT --project "${PROJECT_ID}" --data-file=- >/dev/null
printf '%s' "${KRATOS_SECRETS_COOKIE}" | gcloud secrets versions add KRATOS_SECRETS_COOKIE --project "${PROJECT_ID}" --data-file=- >/dev/null
printf '%s' "${KRATOS_POSTGRES_PASSWORD}" | gcloud secrets versions add KRATOS_POSTGRES_PASSWORD --project "${PROJECT_ID}" --data-file=- >/dev/null

echo "Kratos secrets upserted in project ${PROJECT_ID}."
