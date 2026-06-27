#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
OUT_PATH="${1:-/tmp/neutrino-kratos.local.yml}"

KRATOS_PUBLIC_PORT="${KRATOS_PUBLIC_PORT:-4433}"
KRATOS_ADMIN_PORT="${KRATOS_ADMIN_PORT:-4434}"
KRATOS_IDENTITY_SCHEMA_URL="file://${REPO_ROOT}/infra/kratos/identity.schema.json"
export KRATOS_PUBLIC_PORT KRATOS_ADMIN_PORT KRATOS_IDENTITY_SCHEMA_URL

"${REPO_ROOT}/scripts/kratos-render-config.sh" "${OUT_PATH}"
