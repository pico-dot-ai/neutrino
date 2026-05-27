#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

TEMPLATE_PATH="${REPO_ROOT}/infra/kratos/kratos.config.template.yml"
OUT_PATH="${1:-$(mktemp /tmp/kratos.config.rendered.XXXXXX.yml)}"

required_vars=(
  LOG_LEVEL
  KRATOS_PUBLIC_BASE_URL
  KRATOS_ADMIN_BASE_URL
  WEB_BASE_URL
  OIDC_PROVIDER_CONFIG
  SECRETS_COOKIE
  SECRETS_DEFAULT
  COOKIE_DOMAIN
  COURIER_SMTP_CONNECTION_URI
)

for name in "${required_vars[@]}"; do
  if [ -z "${!name:-}" ]; then
    echo "Missing required env: ${name}" >&2
    exit 1
  fi
done

umask 077
envsubst <"${TEMPLATE_PATH}" >"${OUT_PATH}"
echo "Rendered Kratos config to ${OUT_PATH}"
