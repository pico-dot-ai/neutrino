# pico-app-container

Starter container for new internal pico apps that deploy independently while consuming Neutrino platform capabilities.

Starter Version UUID: `019db1ca-803d-71f7-be40-37c122ed5700`

## Purpose
- provide a runnable web + api monorepo starter
- keep app repos independently deployable
- integrate with Neutrino through `pico_app_id` and OAuth credentials
- preserve contract-first boundaries for provider swaps

## Structure
- `apps/web`: Next.js frontend (public + admin shell)
- `apps/api`: typed Node backend (Cloud Run deploy target)
- `packages/contracts`: app-local ports/interfaces
- `packages/adapters`: app-local infra adapters
- `pico.app.yaml`: platform registration manifest template
- `infra/terraform/cloud-run`: IaC baseline for backend runtime

## Setup
1. Copy this folder into a new repository.
2. Run `npm install`.
3. Fill `.env` from `.env.example`.
4. Register the app in Neutrino Developer Console and obtain:
   - `PICO_APP_ID`
   - `PICO_CLIENT_ID`
   - `PICO_CLIENT_SECRET`
5. Update `pico.app.yaml` with capability requirements and scopes.
6. Run `npm run dev:web` and `npm run dev:api`.

## OAuth + Platform Wiring
Backend should request tokens from `NEUTRINO_TOKEN_URL` and call platform endpoints at `NEUTRINO_GRPC_ENDPOINT` (or REST proxy fallback) with metadata:
- `pico_app_id`
- environment
- required scopes

Frontend should call your app backend, not Neutrino directly.

## Deploy
- Web: Vercel (`apps/web`)
- API: Cloud Run (`apps/api` Dockerfile + cloudbuild)

Use `infra/terraform/cloud-run` for runtime contract and environment variables.

## Capability Onboarding
- Declare required capabilities in `pico.app.yaml`.
- Add backend client methods behind `PlatformCapabilityClient` in `packages/contracts`.
- Implement provider-specific transport in `packages/adapters`.
