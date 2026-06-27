#!/usr/bin/env bash
set -euo pipefail

MAILPIT_DATA_DIR="${MAILPIT_DATA_DIR:-.neutrino/mailpit}"
mkdir -p "${MAILPIT_DATA_DIR}"

exec mailpit \
  --database "${MAILPIT_DATA_DIR}/mailpit.db" \
  --smtp "localhost:1025" \
  --listen "localhost:8025"
