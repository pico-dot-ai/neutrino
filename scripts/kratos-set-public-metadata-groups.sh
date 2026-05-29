#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/kratos-set-public-metadata-groups.sh --identity-id <id> --groups <comma-separated-groups>

Required env:
  KRATOS_ADMIN_URL

Optional env:
  KRATOS_ADMIN_TOKEN
USAGE
}

IDENTITY_ID=""
GROUPS_RAW=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --identity-id)
      IDENTITY_ID="${2:-}"
      shift 2
      ;;
    --groups)
      GROUPS_RAW="${2:-}"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      if [[ "$1" == *"traits.groups"* ]]; then
        echo "Refusing to write traits.groups. Use metadata_public.groups only." >&2
        exit 1
      fi
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "$IDENTITY_ID" || -z "$GROUPS_RAW" ]]; then
  usage >&2
  exit 1
fi

if [[ "${GROUPS_RAW}" == *"traits.groups"* ]]; then
  echo "Refusing to write traits.groups. Use metadata_public.groups only." >&2
  exit 1
fi

if [[ -z "${KRATOS_ADMIN_URL:-}" ]]; then
  echo "KRATOS_ADMIN_URL is required." >&2
  exit 1
fi

GROUPS_JSON="$(printf '%s' "$GROUPS_RAW" | jq -R 'split(",") | map(gsub("^\\s+|\\s+$"; "")) | map(select(length > 0))')"

if [[ "$GROUPS_JSON" == "[]" ]]; then
  echo "At least one group is required." >&2
  exit 1
fi

PAYLOAD="$(jq -n --argjson groups "$GROUPS_JSON" '{metadata_public: {groups: $groups}}')"

AUTH_HEADER=()
if [[ -n "${KRATOS_ADMIN_TOKEN:-}" ]]; then
  AUTH_HEADER=(-H "Authorization: Bearer ${KRATOS_ADMIN_TOKEN}")
fi

HTTP_CODE="$(
  curl -sS -o /tmp/kratos-set-groups-response.json -w '%{http_code}' \
    -X PATCH \
    "${KRATOS_ADMIN_URL%/}/admin/identities/${IDENTITY_ID}" \
    -H 'content-type: application/json' \
    "${AUTH_HEADER[@]}" \
    --data "$PAYLOAD"
)"

if [[ "$HTTP_CODE" != "200" ]]; then
  echo "Kratos identity metadata update failed (status ${HTTP_CODE})." >&2
  exit 1
fi

echo "Kratos identity metadata_public.groups updated."
