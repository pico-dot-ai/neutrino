# API App

Typed HTTP service intended for Cloud Run and portable to App Runner via Docker.

Rules:
- exposes `/healthz`, `/readyz`, and `/v1/chat`
- exposes internal control-plane endpoints under `/v1/control-plane/*`
- orchestrates AI behavior through shared packages and contract ports
- must not import provider adapters directly
