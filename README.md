# neutrino

Neutrino is the working repo for picoAI's composable AI service platform.

The product direction is to define, run, reuse, and govern AI systems through simple files, stable schema and ports, workspace-safe execution, and builder UIs that act as control planes over the same resources.

## Current Baseline
- `apps/web`: Next.js App Router frontend, intended for Vercel
- `apps/api`: typed Node service, intended for Cloud Run and portable to App Runner
- `packages/schema` and `packages/ports`: stable application ports and shared request/response types
- `packages/ui`: shared design system built on `shadcn/ui`
- `packages/adapters`: infrastructure adapters behind ports
- `packages/identity-gateway`: local identity + session gateway wrapper
- `packages/platform-gateway`: control-plane catalog gateway wrapper

## Product Direction
- Apps are developer-facing product packages that expose objects, actions, views, and visibility.
- Services are reusable implementation units behind app actions.
- Agents are reusable actor services.
- Skills are reusable behavioral and procedural modules.
- Harnesses are reusable operational environments around agents, not eval runners.
- Conversations are reusable human and multi-agent runtime primitives.
- Evals are validation and governance modules attached to agents, harnesses, conversations, services, and apps.
- Builder UIs must round-trip with file-defined resources instead of creating hidden app-specific resource structures.

## First Implementation Direction
The first serious implementation plan should prove one vertical path:

`Workspace -> Project -> App manifest -> Object/Action -> Service -> Skill -> Binding -> Conversation runtime -> Execution record -> Trace -> Eval result`

The first run should also include:
- real auth under `auth.pico.ai`
- local username/password auth with a migration path to Ory Kratos and SSO
- hosted Postgres as durable system of record
- pgvector as the first vector implementation
- blob/artifact storage for uploaded and generated binary assets
- explicit, scoped core memory records
- catalog and resolver behavior for file-defined platform resources
- service reuse from one app action to a versioned service package when visibility and grants allow it

## Documentation Map
- `AGENTS.md`: coding-agent working rules
- `architecture/contract.json`: canonical architecture contract
- `docs/architecture-canonical.md`: generated architecture view
- `docs/architecture-foundation.md`: rationale and decision history
- `docs/requirements-baseline.md`: requirement statements and statuses
- `docs/platform-baseline.md`: platform baseline and first vertical milestone
- `docs/deployment-baseline.md`: deployment and infrastructure assumptions

Do not use `docs/data-structure-ref/` for the first implementation-plan setup. Those files are reserved for later task, calendar, and generalized item data modeling.

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
Use Node 24 for local development. The repo includes `.nvmrc` and requires `>=24.0.0` in `package.json`; Node 23 is not a supported line for the current ESLint, Vitest, and jsdom toolchain and will produce `EBADENGINE` warnings.

The API requires:
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `API_PROXY_SHARED_SECRET`

The Vercel-facing app also uses:
- `API_BASE_URL`
- `APP_SESSION_SECRET`
- `APP_SESSION_TTL_SECONDS`
- `APP_IDENTITY_USERS_JSON`
- `APP_AUTH_ENABLED`
- `AUTH_PROVIDER`
- `ORY_KRATOS_PUBLIC_URL`

In production, `AUTH_PROVIDER=ory-kratos` is the primary path. `APP_IDENTITY_USERS_JSON` is only for local, bootstrap, or emergency fallback mode. See [docs/deployment-runbook.md](docs/deployment-runbook.md) for local, staging, production, promotion, and rollback procedures.

For the OpenAI key, use the standard `OPENAI_API_KEY` environment variable described in the [OpenAI quickstart](https://platform.openai.com/docs/quickstart).

## Deployment
- Cloud Build is the canonical API image rollout path.
- Terraform under [infra/terraform/cloud-run](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/infra/terraform/cloud-run) is the source of truth for the Cloud Run runtime contract.
- Do not hand-configure Cloud Run env var names in the UI for normal operation.
- Use [docs/deployment-runbook.md](docs/deployment-runbook.md) for local, staging, production, promotion, rollback, and secret rotation procedures.
