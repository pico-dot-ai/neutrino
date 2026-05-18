# Starter API

Cloud Run-targeted backend starter.

Required endpoints:
- `/healthz`
- `/readyz`
- application APIs under `/v1/*`

Use `packages/schema`, `packages/ports`, and `packages/adapters` to isolate provider-specific implementations.
