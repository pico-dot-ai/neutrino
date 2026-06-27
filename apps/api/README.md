# API App

Typed HTTP service intended for Cloud Run and portable to App Runner via Docker.

Rules:
- exposes `/health`, `/readyz`, and `/v1/chat` (`/healthz` remains a compatibility alias)
- exposes hosted-auth session sync at `/v1/auth/session/sync`
- exposes internal control-plane endpoints under `/v1/control-plane/*`
- exposes internal auth user-management and audit readback endpoints under `/v1/control-plane/auth/*`
- orchestrates AI behavior through shared packages and contract ports
- must not import provider adapters directly
