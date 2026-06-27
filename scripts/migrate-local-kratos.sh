#!/usr/bin/env bash
set -euo pipefail

CONFIG_PATH="${KRATOS_CONFIG_PATH:-/tmp/neutrino-kratos.local.yml}"
LOG_PATH="${KRATOS_MIGRATE_LOG_PATH:-/tmp/neutrino-kratos-migrate.log}"

scripts/render-local-kratos-config.sh "${CONFIG_PATH}" >/dev/null
if ! kratos migrate sql -c "${CONFIG_PATH}" -e --yes >"${LOG_PATH}" 2>&1; then
  cat "${LOG_PATH}" >&2
  exit 1
fi
echo "Kratos migrations are up to date."
