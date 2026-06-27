#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-neutrino-491317}"
REGION="${REGION:-us-central1}"
SERVICE_NAME="${SERVICE_NAME:-neutrino-api}"
MIGRATION_JOB="${MIGRATION_JOB:-neutrino-api-core-migrate}"

SERVICE_URL="$(gcloud run services describe "${SERVICE_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --format='value(status.url)')"

if [ -z "${SERVICE_URL}" ]; then
  echo "Could not resolve Cloud Run service URL for ${SERVICE_NAME}." >&2
  exit 1
fi

curl -fsS "${SERVICE_URL}/health" >/dev/null
curl -fsS "${SERVICE_URL}/readyz" >/dev/null

echo "service_url=${SERVICE_URL}"
echo "health=ok"
echo "readyz=ok"

gcloud run services describe "${SERVICE_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --format='value(status.latestReadyRevisionName,status.latestCreatedRevisionName)'

gcloud run revisions list \
  --project="${PROJECT_ID}" \
  --service="${SERVICE_NAME}" \
  --region="${REGION}" \
  --limit=5

gcloud run jobs executions list \
  --project="${PROJECT_ID}" \
  --job="${MIGRATION_JOB}" \
  --region="${REGION}" \
  --limit=5
