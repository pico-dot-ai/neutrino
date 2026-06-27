#!/usr/bin/env bash
set -euo pipefail

MAINTENANCE_DATABASE_URL="${LOCAL_POSTGRES_MAINTENANCE_DATABASE_URL:-postgresql://localhost:5432/postgres}"
POSTGRES_APP_USER="${POSTGRES_APP_USER:-platform_user}"
POSTGRES_APP_PASSWORD="${POSTGRES_APP_PASSWORD:-platform_password}"
KRATOS_DATABASE_NAME="${KRATOS_DATABASE_NAME:-kratos}"
KRATOS_DATABASE_USER="${KRATOS_DATABASE_USER:-kratos_user}"
KRATOS_POSTGRES_PASSWORD="${KRATOS_POSTGRES_PASSWORD:-kratos_password}"

psql "${MAINTENANCE_DATABASE_URL}" -v ON_ERROR_STOP=1 \
  -v app_user="${POSTGRES_APP_USER}" \
  -v app_password="${POSTGRES_APP_PASSWORD}" \
  -v kratos_user="${KRATOS_DATABASE_USER}" \
  -v kratos_password="${KRATOS_POSTGRES_PASSWORD}" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'app_user', :'app_password')
WHERE NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = :'app_user')
\gexec
ALTER ROLE :"app_user" WITH LOGIN PASSWORD :'app_password';

SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'kratos_user', :'kratos_password')
WHERE NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = :'kratos_user')
\gexec
ALTER ROLE :"kratos_user" WITH LOGIN PASSWORD :'kratos_password';
SQL

ensure_database() {
  local database_name="$1"
  local owner="$2"

  psql "${MAINTENANCE_DATABASE_URL}" -v ON_ERROR_STOP=1 \
    -v database_name="${database_name}" \
    -v owner="${owner}" <<'SQL'
SELECT format('CREATE DATABASE %I OWNER %I', :'database_name', :'owner')
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = :'database_name')
\gexec
SQL
}

ensure_database platform_prod "${POSTGRES_APP_USER}"
ensure_database platform_test "${POSTGRES_APP_USER}"
ensure_database "${KRATOS_DATABASE_NAME}" "${KRATOS_DATABASE_USER}"

ensure_vector_extension() {
  local database_name="$1"

  psql "${MAINTENANCE_DATABASE_URL}" -v ON_ERROR_STOP=1 \
    -v database_name="${database_name}" <<'SQL'
\connect :"database_name"
CREATE EXTENSION IF NOT EXISTS vector;
SQL
}

ensure_vector_extension platform_prod
ensure_vector_extension platform_test

echo "Local Postgres databases are ready: platform_prod, platform_test, ${KRATOS_DATABASE_NAME}."
