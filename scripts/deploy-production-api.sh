#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-neutrino-491317}"
REGION="${REGION:-us-central1}"
AR_HOSTNAME="${AR_HOSTNAME:-us-central1-docker.pkg.dev}"
AR_REPOSITORY="${AR_REPOSITORY:-cloud-run-source-deploy}"
IMAGE_NAME="${IMAGE_NAME:-neutrino-api}"
SERVICE_NAME="${SERVICE_NAME:-neutrino-api}"
MIGRATION_JOB="${MIGRATION_JOB:-neutrino-api-core-migrate}"
SKIP_VALIDATION="${SKIP_VALIDATION:-0}"
CONFIRM_PRODUCTION_API_DEPLOY="${CONFIRM_PRODUCTION_API_DEPLOY:-}"

if [ "${CONFIRM_PRODUCTION_API_DEPLOY}" != "yes" ]; then
  echo "Refusing production API deploy. Set CONFIRM_PRODUCTION_API_DEPLOY=yes after operator approval." >&2
  exit 1
fi

gcloud config set project "${PROJECT_ID}" >/dev/null

if [ "${SKIP_VALIDATION}" != "1" ]; then
  npm run test
  npm run typecheck
  npm run lint
  npm run build
  npm run architecture:check
  npm run starter:version:check
fi

scripts/check-production-secrets.sh

gcloud builds submit . \
  --project="${PROJECT_ID}" \
  --config=cloudbuild.yaml \
  --substitutions="_AR_HOSTNAME=${AR_HOSTNAME},_AR_REPOSITORY=${AR_REPOSITORY},_IMAGE_NAME=${IMAGE_NAME},_SERVICE_NAME=${SERVICE_NAME},_MIGRATION_JOB=${MIGRATION_JOB},_DEPLOY_REGION=${REGION}"

scripts/verify-production-api.sh
