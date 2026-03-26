# neutrino

Neutrino is an AI-first monorepo with a Vercel web client, a Cloud Run API, and contract-first adapters that keep infrastructure choices swappable.

## Current Baseline
- `apps/web`: Next.js App Router frontend, intended for Vercel
- `apps/api`: typed Node service, intended for Cloud Run and portable to App Runner
- `packages/contracts`: stable application ports and shared request/response types
- `packages/ui`: shared design system built on `shadcn/ui`
- `packages/adapters`: infrastructure adapters behind contract ports

## Commands
- `npm install`
- `npm run dev:web`
- `npm run dev:api`
- `npm run build`
- `npm run test`
- `npm run typecheck`
- `npm run architecture:render`
- `npm run architecture:check`

## Environment
The API requires:
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `API_PROXY_SHARED_SECRET`

The Vercel-facing app also uses:
- `APP_GATE_USERNAME`
- `APP_GATE_PASSWORD`
- `API_BASE_URL`

For the OpenAI key, use the standard `OPENAI_API_KEY` environment variable described in the [OpenAI quickstart](https://platform.openai.com/docs/quickstart).

## Deployment
- Cloud Build is the canonical API image rollout path.
- Terraform under [infra/terraform/cloud-run](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/infra/terraform/cloud-run) is the source of truth for the Cloud Run runtime contract.
- Do not hand-configure Cloud Run env var names in the UI for normal operation.
