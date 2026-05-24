# Ops Known Issues

Last updated: 2026-05-24

## Purpose
This file is the durable incident and remediation ledger for recurring deployment and runtime issues.

Use this to capture:
- observable failure symptom
- root cause
- confirmed fix
- prevention guardrail

This is operational truth. Keep entries short, specific, and reproducible.

## Template
When adding a new issue, use:

```markdown
## ISSUE-XXX: <short title>
- Date first seen:
- Surfaces:
- Symptom:
- Root cause:
- Fix:
- Prevention:
- Verification:
```

## ISSUE-001: Cloud Build invalid substitution for shell variable
- Date first seen: 2026-05-18
- Surfaces: Cloud Build trigger / `cloudbuild.yaml`
- Symptom: `invalid value for 'build.substitutions': key in the template "SERVICE_URL" is not a valid built-in substitution`
- Root cause: Cloud Build parsed `${SERVICE_URL}` as a build substitution key instead of a shell variable in the `curl` step.
- Fix: Escape shell variable as `$${SERVICE_URL}` in [cloudbuild.yaml](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/cloudbuild.yaml).
- Prevention: In Cloud Build script steps, use `$${VAR}` for shell variables when the YAML is parsed by Cloud Build substitutions.
- Verification: Trigger executes past curl health-check step without substitution validation failure.

## ISSUE-002: Docker workspace install falls back to npm registry
- Date first seen: 2026-05-18
- Surfaces: API Docker build (`apps/api/Dockerfile`)
- Symptom: `npm ERR! 404 Not Found ... @neutrino/platform-gateway@0.1.0` during `npm install`.
- Root cause: Workspace package manifest was not copied before `npm install`, so npm resolved local workspace dependency as remote registry dependency.
- Fix: Include missing workspace manifests in pre-install copy set in [apps/api/Dockerfile](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/apps/api/Dockerfile) (`packages/platform-gateway/package.json`, `packages/identity-gateway/package.json`).
- Prevention: Keep pre-install manifest copy list in sync with workspace deps referenced by copied app manifests (`apps/api`, `apps/web`).
- Verification: Docker build reaches `npm install` success without `@neutrino/*` 404.

## ISSUE-003: Cloud Run revision fails to start on PORT=8080
- Date first seen: 2026-05-18
- Surfaces: Cloud Run deploy / API runtime startup
- Symptom: Cloud Run revision fails with `failed to start and listen on the port ... PORT=8080`.
- Root cause: API bundle still had runtime import of `@neutrino/platform-gateway`, which points at TypeScript source; runtime crashed before binding the port.
- Fix: Bundle all `@neutrino/*` workspace packages into API output by setting `noExternal: [/^@neutrino\\//]` in [apps/api/tsup.config.ts](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/apps/api/tsup.config.ts).
- Prevention: For deployable Node bundles, avoid runtime imports of local workspace TS source unless the package is separately built and shipped in the runtime image.
- Verification: `apps/api/dist/server.js` contains inlined platform-gateway/adapters and no runtime `@neutrino/*` imports; Cloud Run revision becomes ready.

## ISSUE-004: Production login failure due to missing identity user list
- Date first seen: 2026-05-18
- Surfaces: Vercel web app auth flow
- Symptom: Login returns `Missing APP_IDENTITY_USERS_JSON`.
- Root cause: Production path intentionally disables local fallback credentials and requires explicit identity user configuration.
- Fix: Set `APP_IDENTITY_USERS_JSON` in Vercel production with at least one `app_admin` user. Set `APP_SESSION_SECRET` as a strong random value.
- Prevention: Treat Vercel env vars as deployment config managed outside git; validate required auth vars before promoting to production.
- Verification: `/login` can authenticate configured admin user in production.

## ISSUE-005: Migration job applies zero SQL files due to wrong image migration path
- Date first seen: 2026-05-24
- Surfaces: Cloud Run migration job / API runtime control-plane routes
- Symptom: Migration execution reports success but runtime endpoints fail with `relation "workspaces" does not exist`.
- Root cause: Runtime image copied root `migrations/` (only `.gitkeep`) into `./apps/migrations`, while core migrations live under `packages/core/migrations`. The migrator loaded no `.sql` files and applied nothing.
- Fix: Update [apps/api/Dockerfile](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/apps/api/Dockerfile) to copy `packages/core/migrations` into `./apps/migrations`, redeploy, and re-run migration job.
- Prevention: Keep runtime migration copy path aligned to the actual source-of-truth migration directory; verify migration execution logs include non-empty `applied` or `skipped` migration IDs.
- Verification:
  - `gcloud logging read 'resource.type="cloud_run_job" AND resource.labels.job_name="neutrino-api-core-migrate" ...'`
  - confirm migration output lists `0001_core_foundation` and `0002_durable_repository_alignment` in `applied` or `skipped`
  - `curl -i <service-url>/v1/control-plane/context` returns `200` (with auth headers).
