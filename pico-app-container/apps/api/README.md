# Starter API

Cloud Run-targeted backend starter.

Required endpoints:
- `/healthz`
- `/readyz`
- application APIs under `/v1/*`

Use `packages/contracts` and `packages/adapters` to isolate provider-specific implementations.
