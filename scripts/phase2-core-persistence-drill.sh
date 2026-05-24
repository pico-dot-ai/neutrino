#!/usr/bin/env bash

set -euo pipefail

if ! command -v psql >/dev/null 2>&1; then
  echo "Missing required command: psql" >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "Missing required command: pg_dump" >&2
  exit 1
fi

if ! command -v pg_restore >/dev/null 2>&1; then
  echo "Missing required command: pg_restore" >&2
  exit 1
fi

if [ -z "${CORE_PHASE2_MAINTENANCE_DATABASE_URL:-}" ]; then
  echo "Missing CORE_PHASE2_MAINTENANCE_DATABASE_URL" >&2
  exit 1
fi

if [ -z "${CORE_PHASE2_STAGE_DATABASE_URL:-}" ]; then
  echo "Missing CORE_PHASE2_STAGE_DATABASE_URL" >&2
  exit 1
fi

if [ -z "${CORE_PHASE2_RESTORE_DATABASE_URL:-}" ]; then
  echo "Missing CORE_PHASE2_RESTORE_DATABASE_URL" >&2
  exit 1
fi

if [ -z "${CORE_PHASE2_STAGE_DB_NAME:-}" ]; then
  echo "Missing CORE_PHASE2_STAGE_DB_NAME" >&2
  exit 1
fi

if [ -z "${CORE_PHASE2_RESTORE_DB_NAME:-}" ]; then
  echo "Missing CORE_PHASE2_RESTORE_DB_NAME" >&2
  exit 1
fi

STAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
BACKUP_FILE="/tmp/${CORE_PHASE2_STAGE_DB_NAME}-${STAMP}.dump"
PROBE_ID="phase2-probe-${STAMP}"
MIGRATION_STAGE_LOG="/tmp/${CORE_PHASE2_STAGE_DB_NAME}-${STAMP}-migrate.log"
MIGRATION_RESTORE_LOG="/tmp/${CORE_PHASE2_RESTORE_DB_NAME}-${STAMP}-migrate.log"

echo "phase2_drill:start stamp=${STAMP}"
echo "phase2_drill:drop_create stage_db=${CORE_PHASE2_STAGE_DB_NAME} restore_db=${CORE_PHASE2_RESTORE_DB_NAME}"
psql "${CORE_PHASE2_MAINTENANCE_DATABASE_URL}" -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"${CORE_PHASE2_STAGE_DB_NAME}\";"
psql "${CORE_PHASE2_MAINTENANCE_DATABASE_URL}" -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"${CORE_PHASE2_RESTORE_DB_NAME}\";"
psql "${CORE_PHASE2_MAINTENANCE_DATABASE_URL}" -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"${CORE_PHASE2_STAGE_DB_NAME}\";"

echo "phase2_drill:migrate stage"
CORE_DATABASE_URL="${CORE_PHASE2_STAGE_DATABASE_URL}" npm run migrate --workspace @neutrino/core >"${MIGRATION_STAGE_LOG}"

echo "phase2_drill:seed probe"
psql "${CORE_PHASE2_STAGE_DATABASE_URL}" -v ON_ERROR_STOP=1 -c "CREATE TABLE IF NOT EXISTS phase2_restore_probe (id TEXT PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());"
psql "${CORE_PHASE2_STAGE_DATABASE_URL}" -v ON_ERROR_STOP=1 -c "INSERT INTO phase2_restore_probe(id) VALUES ('${PROBE_ID}');"

echo "phase2_drill:backup file=${BACKUP_FILE}"
pg_dump "${CORE_PHASE2_STAGE_DATABASE_URL}" --format=custom --file "${BACKUP_FILE}"

echo "phase2_drill:restore"
psql "${CORE_PHASE2_MAINTENANCE_DATABASE_URL}" -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"${CORE_PHASE2_RESTORE_DB_NAME}\";"
pg_restore --clean --if-exists --no-owner --no-privileges --dbname "${CORE_PHASE2_RESTORE_DATABASE_URL}" "${BACKUP_FILE}"

echo "phase2_drill:migrate_status restore"
CORE_DATABASE_URL="${CORE_PHASE2_RESTORE_DATABASE_URL}" npm run migrate:status --workspace @neutrino/core >"${MIGRATION_RESTORE_LOG}"

PROBE_COUNT="$(psql "${CORE_PHASE2_RESTORE_DATABASE_URL}" -t -A -v ON_ERROR_STOP=1 -c "SELECT COUNT(*) FROM phase2_restore_probe WHERE id='${PROBE_ID}';")"
STAGE_STATUS_JSON="$(CORE_DATABASE_URL="${CORE_PHASE2_STAGE_DATABASE_URL}" npm run migrate:status --workspace @neutrino/core | sed -n '/^{/,$p')"
RESTORE_STATUS_JSON="$(CORE_DATABASE_URL="${CORE_PHASE2_RESTORE_DATABASE_URL}" npm run migrate:status --workspace @neutrino/core | sed -n '/^{/,$p')"
STAGE_PENDING_COUNT="$(printf '%s\n' "${STAGE_STATUS_JSON}" | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{const j=JSON.parse(s);process.stdout.write(String((j.pendingMigrations||[]).length));});')"
RESTORE_PENDING_COUNT="$(printf '%s\n' "${RESTORE_STATUS_JSON}" | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{const j=JSON.parse(s);process.stdout.write(String((j.pendingMigrations||[]).length));});')"
STAGE_PENDING="pending: ${STAGE_PENDING_COUNT}"
RESTORE_PENDING="pending: ${RESTORE_PENDING_COUNT}"

if [ "${PROBE_COUNT}" != "1" ]; then
  echo "Restore probe validation failed. Expected probe count 1, got ${PROBE_COUNT}." >&2
  exit 1
fi

if [ "${STAGE_PENDING_COUNT}" != "0" ]; then
  echo "Stage migration status validation failed. Expected pending migrations 0, got ${STAGE_PENDING_COUNT}." >&2
  exit 1
fi

if [ "${RESTORE_PENDING_COUNT}" != "0" ]; then
  echo "Restore migration status validation failed. Expected pending migrations 0, got ${RESTORE_PENDING_COUNT}." >&2
  exit 1
fi

echo "phase2_drill:result"
echo "stage_db=${CORE_PHASE2_STAGE_DB_NAME}"
echo "restore_db=${CORE_PHASE2_RESTORE_DB_NAME}"
echo "backup_file=${BACKUP_FILE}"
echo "probe_id=${PROBE_ID}"
echo "probe_count=${PROBE_COUNT}"
echo "stage_migration=${STAGE_PENDING}"
echo "restore_migration=${RESTORE_PENDING}"
echo "migrate_stage_log=${MIGRATION_STAGE_LOG}"
echo "migrate_restore_log=${MIGRATION_RESTORE_LOG}"
echo "phase2_drill:success"
