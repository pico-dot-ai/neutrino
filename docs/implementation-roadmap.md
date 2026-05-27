# Neutrino Implementation Roadmap

Last updated: 2026-05-24
Owner: Platform engineering
Repo roadmap source: this file
Execution tracker: Linear project `Neutrino Platform Implementation Roadmap`

## Scope and Source of Truth
This roadmap tracks implementation execution for the approved Neutrino platform plan.

Related sources:
- Requirements baseline: `docs/requirements-baseline.md`
- Canonical architecture contract: `architecture/contract.json`
- Generated architecture view: `docs/architecture-canonical.md`
- Auth baseline and OpenFGA mapping: `docs/auth-baseline.md`
- Platform/deployment assumptions: `docs/platform-baseline.md`, `docs/deployment-baseline.md`

Out of scope for this phase:
- `docs/data-structure-ref/`
- First-class recipe or template product surfaces; these remain possible scaffolding conveniences, not core platform artifacts.

## Status Legend
- `Planned`: agreed but not started
- `In Progress`: active implementation
- `Blocked`: cannot proceed until dependency/decision is resolved
- `Done`: implemented and validated against acceptance criteria

## Phase Tracker

| Phase | Name | Status | Exit Criteria |
| --- | --- | --- | --- |
| 1 | Rename and Restructure Foundation | Done | `packages/contracts` removed, `schema/ports/core` shape adopted, imports updated, architecture check + typecheck pass |
| 2 | Core Persistence (Postgres canonical) | Done | `@neutrino/core` repositories + migrations in place, GCP Postgres provisioning + secret wiring validated, backup/restore drill and migration promotion flow validated and documented |
| 3 | Infrastructure Ports and Adapters | Done | baseline adapters wired for model, embedding/vector, object storage, identity/session, policy |
| 4 | Manifest Registry, Catalog, Bindings, and Manifests | In Progress | scoped manifest registry exists, manifests validate, resources register, bindings resolve runtime plan |
| 5 | Auth and Data Platform | In Progress | Ory/Kratos authn/session migration planned and implemented, OpenFGA authz model planned separately, memory/artifact/vector persistence validated |
| 6 | Dev Agent Runtime | In Progress | end-to-end runtime path persists run, trace, usage/cost, memory access, eval output |
| 7 | Service Reuse and Control-Plane UI | In Progress | cross-app service reuse/authorization validated and surfaced in UI |

## Current Alpha Milestone: Publish, Bind, Invoke, Inspect

Goal: make the first internal alpha workflow real and repeatable.

Target workflow:
`developer login -> inspect persisted context -> register/update manifests -> bind service -> invoke app action -> inspect persisted run/trace/usage/memory/artifact history`

Exit criteria:
- persisted app/service/binding inventory is visible from the control-plane UI
- manifest and binding registration require authorized actor/group grants
- Dev Agent action invocation runs through app/action/service identity, not a debug-only path
- successful and failed executions persist run, trace, usage, memory, and artifact metadata
- deployed runtime writes artifact bytes to GCS while Postgres owns artifact metadata
- browser/IAB or HTTP walkthrough verifies the workflow without Playwright
- backup/restore and migration-promotion work is explicitly tracked before treating production data as durable

## Detailed Phases

### Phase 1: Rename and Restructure Foundation
Status: `Done`

Target outcomes:
- Replace `@neutrino/contracts` with `@neutrino/schema`
- Introduce `@neutrino/ports`
- Keep adapter implementations behind ports
- Ensure architecture docs/render/check align with new package topology

Validation:
- `npm run architecture:check`
- `npm run typecheck`

Current notes:
- New package roots (`packages/schema`, `packages/ports`, `packages/core`) are in place.
- Legacy `packages/contracts` references were removed from the active Neutrino repo and starter scaffold surfaces.
- Validation gates currently expected for this phase: architecture check and typecheck.

### Phase 2: Core Persistence (Postgres canonical)
Status: `Done`

Target outcomes:
- `@neutrino/core` owns canonical persistence for core platform records.
- Postgres is explicit system of record for core state.
- SQL/repository ownership centralized in core.

Validation:
- Repository tests pass
- Clean database migrate/bootstrap path passes
- Managed Postgres provisioning for deploy environments is codified in IaC
- Cloud Run runtime has production secret wiring for `CORE_DATABASE_URL`/`DATABASE_URL`
- Migration promotion path is defined and validated (staging then production)

Current notes:
- `packages/core` includes repositories and migration tooling.
- The foundation SQL now uses the accepted workspace/app/object/action/service/execution/access graph model: `workspaces`, `orgs`, `projects`, `actors`, `groups`, `identities`, `grants`, app packages/versions/installations, object types/objects, action definitions, service packages/versions, bindings/snapshots, executions, records, traces, memory, artifacts, audit, usage, and cost.
- Kysely database typing is aligned to the foundation SQL.
- Migration runner and status commands exist in `@neutrino/core` (`npm run migrate --workspace @neutrino/core` and `npm run migrate:status --workspace @neutrino/core`) using `CORE_DATABASE_URL` (or `DATABASE_URL`).
- Validated on a clean local Postgres 17 instance with pgvector extension (`platform_stage` / `platform_user`), with migration `0001_core_foundation` applied and no pending migrations.
- Runtime secret wiring and migration execution hooks are now defined in deployment IaC (`CORE_DATABASE_URL` secret binding + Cloud Run migration job + Cloud Build execution before service rollout).
- Postgres-backed repositories are implemented behind the core ports for manifest registry, access graph, bindings, runs, traces, usage, memory, and artifact metadata.
- `npm run test:core:postgres` validates the durable repository vertical against `CORE_TEST_DATABASE_URL`.
- GCP Postgres infrastructure has been applied and validated in both prototype and hardened profiles: Terraform output succeeds, Cloud Run migration job completes, and `/readyz` returns HTTP 200.
- Self-managed Postgres now has explicit Terraform mode profiles:
  - `prototype` (lowest-cost dev): public-IP VM + CIDR-scoped ingress, no Serverless VPC connector/NAT.
  - `hardened` (private): private VM + Serverless VPC connector + Cloud NAT + private ingress path.
- Backup/restore + migration promotion drill validated on 2026-05-24 UTC using `npm run phase2:drill` against dedicated non-prod databases (`platform_phase2_stage`, `platform_phase2_restore`) with successful probe restore, zero pending migrations on both DBs, and backup artifact `/tmp/platform_phase2_stage-20260524T165808Z.dump`.
- Live runtime readiness remains healthy after migration validation: `GET /readyz` on `https://neutrino-api-jeo3uupuxa-uc.a.run.app` returned HTTP 200 (`{"status":"ready"}`) on 2026-05-24 UTC.

### Phase 2 Postgres Profile (Temporary)
- During concept validation, use one self-managed Postgres + pgvector VM for staging/prod-like environments.
- Keep the boundary portable:
  - runtime uses only `CORE_DATABASE_URL`/`DATABASE_URL`
  - no hardcoded provider-specific host/user naming in application code
- Prototype deployment target:
  - Postgres runs on a Terraform-managed Compute Engine VM, not Cloud Run.
  - In `prototype` mode, Cloud Run connects to the VM public IP through the CIDR-scoped firewall; no Serverless VPC Access connector or Cloud NAT is provisioned.
  - In `hardened` mode, Cloud Run connects over Serverless VPC Access and `CORE_DATABASE_URL` uses the VM private IP from Terraform output `postgres_internal_ip`.
  - `CORE_DATABASE_URL` uses `postgres_public_ip` in prototype mode and `postgres_internal_ip` in hardened mode.
- Current auth-platform target:
  - Keep one Postgres VM.
  - Expose Kratos public HTTP API to the internet.
  - Keep Postgres and Kratos admin private.
  - Use `hardened` mode before customer exposure.
- Minimum required controls before calling Phase 2 complete:
  - separate staging and production databases
  - automated backup policy and at least one verified restore drill
  - migration promotion path: staging migrate -> validate -> production backup -> production migrate
  - documented rollback/recovery runbook for partial migration failures
- Exit criterion from temporary shared-VM profile:
  - retain ability to switch to managed Postgres later without application-layer rewrites.

### Phase 3: Infrastructure Ports and Adapters
Status: `Done`

Target outcomes:
- Ports in place for:
  - `LanguageModelProvider`
  - `EmbeddingProvider`
  - `VectorIndex`
  - `ObjectStorage`
  - `IdentityProvider`
  - `SessionManager`
  - `PolicyEngine`
- Local/default adapters implemented and tested.

Validation:
- Focused unit/integration tests per adapter path.

Current notes:
- Adapter refactors are active in `packages/adapters/*`.
- Local adapter coverage now includes:
  - `LocalObjectStorageAdapter` behavior tests for write/read/delete and URI handling.
  - `LocalPolicyEngineAdapter` rule-evaluation tests for allow/deny/default-deny behavior.
  - `PgVectorAdapter` implementation over self-hosted Postgres + pgvector with adapter tests covering upsert/query/delete behavior (executes live when `PGVECTOR_TEST_DATABASE_URL` is provided).
  - explicit placeholder tests confirming `QdrantAdapter` remains intentionally deferred for the internal-alpha milestone.
- Decision: pgvector is sufficient for the current milestone; Qdrant is deferred to a future backing-service milestone.
- Live pgvector validation evidence captured on 2026-05-24 UTC with `PGVECTOR_TEST_DATABASE_URL="$CORE_TEST_DATABASE_URL" npm run test --workspace @neutrino/adapters -- vector/vector-adapters.test.ts` (`2 passed`).

### Phase 4: Manifest Registry, Catalog, Bindings, and Manifests
Status: `In Progress`

Target outcomes:
- Manifest set under `@neutrino/schema`:
  - `pico.app`, `pico.service`, `pico.agent`, `pico.skill`, `pico.harness`, `pico.capability`, `pico.conversation`, `pico.eval`, `pico.binding`, `pico.policy`
- Service manifest semantics:
  - package-style service identity in the shape `@scope/service-name@version`
  - `@pico/*` reserved for first-party platform services and defaults
  - workspace/company namespaces such as `@acme/*` for company-owned shared services
  - image, entrypoint, port, healthcheck, compose, and sidecar fields remain out of the core service manifest until a concrete runtime need exists
- App manifest semantics:
  - apps publish app-defined objects, actions, views, handlers, and visibility rules
  - actions can use local handlers or versioned reusable services
  - visibility controls whether apps, actions, objects, views, and services are internal, public, or explicitly exposed to selected workspaces, orgs, groups, or actors
- Simple access graph in place:
  - `actor`, `group`, `identity`, and `grant` are the first-cut schema primitives
  - org/team/customer structure is modeled through groups plus grants until a concrete use case proves a separate primitive is needed
  - SSO links to actors through identity records
- Scoped manifest registry/catalog in place:
  - every app, object, action, view, service, agent, skill, harness, conversation, eval, binding, and policy manifest can be registered, versioned, listed, resolved, and audited by workspace/org/group/project/app installation/actor context
  - Dev Agent manifests become seeded registry records, not a permanent singleton special case
- Catalog services in place:
  - `ServiceCatalog`, `CapabilityCatalog`, `OAuthClientCatalog`
- `BindingResolver` produces runtime-resolved execution selections.

Validation:
- Dev agent app manifest validates, registers, and resolves through bindings.
- Service manifest validation rejects missing version and invalid package-style service names.
- At least two agent manifests can be registered under separate project scopes and resolved without ID/scope leakage.
- Runtime selection can resolve the agent/harness/binding from request scope instead of hardcoded Dev Agent constants.

Current notes:
- `pico.app` manifests now support package name, publisher, visibility, objects, actions, and views.
- `pico.service` manifests now support package name, summary, schema input/output, policy, used tools, followed skills, emitted records, and optional interface functions.
- Manifest validation rejects app actions without a handler or versioned service reference and rejects invalid service package/schema/policy shape.
- The platform schema and auth/session surface now use `workspaceId`, `actor`, `actorId`, and `groups`; the old `tenantId`/`principal`/role vocabulary has been removed from active runtime paths.
- The simple access graph port and in-memory repository are in place for actors, groups, identities, and grants.
- Dev Agent manifest-set validation coverage now includes app/service/skill/harness/agent/binding manifests.
- Service registration and binding resolution tests for the Dev Agent local path are in place in `@neutrino/core`.
- `ManifestRegistry` port and in-memory implementation are in place for scoped manifest registration, listing, lifecycle-aware resolution, and latest-version selection.
- Dev Agent bootstrap seeds manifests into the registry and resolves app/agent/harness/binding data from registry state before runtime execution.
- Two project-scoped agent manifests with overlapping IDs resolve independently in tests.
- Read-only manifest control-plane readback (`/v1/control-plane/manifests`) returns seeded registry records with `kind` and `resourceId` filters.
- Admin console includes a read-only Manifest Registry panel showing manifest kind, resource ID, version, lifecycle state, and scope metadata.
- The first service-reuse vertical is the Dev Agent path: Dev Agent app manifest -> action -> reusable service package -> local bindings -> runtime resolution.

### Phase 5: Auth and Data Platform
Status: `In Progress`

Target outcomes:
- Session-backed auth with real login page (no HTTP Basic Auth).
- Ory/Kratos becomes the authentication and session-management implementation target.
- Local username/password implementation remains only as development, bootstrap, and emergency fallback until Ory/Kratos is implemented.
- SSO migration path remains behind identity, authenticator, directory, and policy provider ports.
- OpenFGA becomes the accepted durable runtime authorization model behind `PolicyEngine`; Ory Keto/Permissions is a related Zanzibar-style option, not the selected runtime authz engine.
- No permission builder is included in the current plan; future builder forms must project to OpenFGA models and relationship tuples.
- Postgres + pgvector in first implementation slice.
- Artifact bytes in `ObjectStorage`; metadata in repository.
- Canonical memory in repository with searchable indexing through memory index.

Validation:
- Ory/Kratos authn/session plan and implementation tests pass when that slice starts.
- OpenFGA authorization model is documented in `docs/auth-baseline.md` before authz implementation starts.
- Memory/artifact/vector tests pass

Current notes:
- Login/session/admin surfaces exist; continue hardening and coverage.
- Accepted implementation order is: Ory/Kratos authn/session first, OpenFGA authz second.
- Current Neutrino grants remain source inputs, audit metadata, and local/bootstrap records that will sync into OpenFGA relationship tuples during authz implementation.
- Postgres-backed core repositories are implemented for manifest registry, access graph, bindings, executions/runs, traces, usage, memory, and artifact metadata.
- `CORE_DATABASE_URL` or explicit repository configuration selects durable Postgres repositories; in-memory repositories remain the fallback for local/bootstrap use.
- `npm run test:core:postgres` loads `CORE_TEST_DATABASE_URL`, migrates the test database, and runs the Postgres repository integration test.
- Local repository integration coverage validates manifest registry, access graph, bindings, successful and failed executions, traces, usage, memory, and artifact metadata against Postgres.
- API action invocation now writes artifact bytes through `ObjectStorage`; local development uses local object storage and deployed Cloud Run uses GCS.
- Terraform manages the internal-alpha artifact bucket and injects `OBJECT_STORAGE_PROVIDER`, `OBJECT_STORAGE_GCS_BUCKET`, and `OBJECT_STORAGE_GCS_PREFIX` into Cloud Run service/job environments.

### Phase 6: Dev Agent Runtime
Status: `In Progress`

Target outcomes:
- Own runtime (no Vercel AI SDK).
- Path implemented:
  `Workspace -> Project -> App manifest -> Object/Action -> Service -> Skill -> Binding -> Conversation runtime -> Execution record -> Trace -> Eval result`
- Harness governs context, permissions, policy, capabilities, limits, memory, tracing, eval hooks.
- Runtime enforces the hard execution rules:
  - no execution without actor
  - no record without scope
  - no retrieval without policy
  - no service without version
  - no binding without snapshot
  - no output without schema

Validation:
- Admin/debug route executes full path and persists run/trace/usage/memory/eval outputs.
- Persisted runtime records reference action ID where applicable, service package name/version, actor, scope, policy snapshot, binding snapshot, schema versions, and dependency versions where applicable.

Current notes:
- `/v1/chat` runs through the Dev Agent runtime and preserves the existing SSE chat contract.
- `/v1/chat` accepts optional runtime scope selection (`workspaceId`, `projectId`, `agentId`) while preserving Dev Agent defaults when omitted.
- `/v1/chat` now carries the authenticated admin `actorId` into runtime execution records, and runtime records include action ID, service package name/version, and schema-version metadata.
- `POST /v1/apps/:appId/actions/:actionId/invoke` invokes the Dev Agent vertical through app/action/service identity, persists memory and artifact metadata, and denies actors without a matching grant.
- App action invocation now supports group-aware authorization via `x-pico-admin-groups`.
- Invalid runtime selection returns an SSE `error` event without changing the stream contract.
- Authorized control-plane runtime readback (`/v1/control-plane/runtime/runs`) returns run, trace, usage, memory, and artifact records for the Dev Agent scope.
- Admin console runtime panel surfaces run status, model, started/completed timestamps, trace count, output/error preview, and explicit refresh behavior.
- Browser verification on 2026-05-20 confirmed `/login` auth, `/admin/debug/chat` prompt execution, and `/admin` runtime readback showing succeeded status, `gpt-5-mini`, timestamps, 2 traces, and output preview.
- Browser verification on 2026-05-21 confirmed the Manifest Registry panel, `/admin/debug/chat` prompt execution, and `/admin` runtime refresh/readback showing succeeded status, `gpt-5-mini`, timestamps, 2 traces, and output preview.

### Phase 7: Service Reuse and Control-Plane UI
Status: `Completed`

Target outcomes:
- First reusable Dev Agent service path available through catalog+bindings.
- Authorization boundary enforced for consumer access.
- UI reflects persisted catalog/binding/run/trace/usage/memory/artifact state.

Validation:
- Authorized consumer succeeds; unauthorized consumer denied.
- UI inspection confirms persisted lifecycle visibility.

Current notes:
- Control-plane APIs now expose context, manifests, apps, services, bindings, and runtime readback.
- Manifest and binding registration endpoints write the same file-defined manifest resources used by the repo.
- Control-plane write endpoints require a `can_manage` grant through actor/group authorization.
- The admin console is moving from OAuth/capability debug panels toward a persisted control-plane inventory surface with app/action/service/binding/runtime/memory/artifact visibility.
- Internal-alpha workflow verification is complete via deployed HTTP workflow evidence: authorized context/readback, manifest+binding registration, authorized invoke, unauthorized denial, persisted runtime readback, and GCS artifact byte confirmation.
- `/admin` now runs as a two-pane control-plane shell (`?section=` hybrid navigation) with persisted inventory sections and structured manifest/binding builders plus JSON escape hatches.
- Web test coverage now validates section routing, structured registration flows, JSON escape hatch flow, and invoke workflow behavior against existing API contracts.

## Open-Source Evaluations (Post-MVP or Conditional)
- Ory Keto/Permissions remains a related Zanzibar-style authz option for future comparison, but OpenFGA is the accepted durable runtime authz model.
- Later SSO provider integration beyond Ory/Kratos identity/session migration remains conditional.
- Durable workflows: Temporal or Inngest
- Memory backends: Mem0, Zep/Graphiti, Letta
- Vector backend alternatives: Qdrant or Pinecone

## Immediate Next Actions
1. Plan and implement Ory/Kratos authentication and session migration (`THU-22`).
2. Plan OpenFGA durable authorization model implementation using `docs/auth-baseline.md` as the mapping baseline (`THU-30`).
3. Complete pre-customer DB hardening gate for shared Postgres VM: private-only DB networking, staged migration promotion/runbook verification, and backup/restore evidence.

## Deferred Backlog
- Add GitHub Actions deployment orchestration for API cloud deploys while keeping Cloud Build as the build/deploy worker.
- Goal: improve GitHub-native deployment visibility/history and environment-gated approvals without replacing the current working Cloud Build path immediately.
- Scope when prioritized:
  - add `.github/workflows/deploy-api.yml` for push-to-main production deploy orchestration
  - use GCP Workload Identity Federation for GitHub Actions auth
  - prevent double deploy by disabling direct Cloud Build GitHub trigger once Actions orchestration is active
- Define and implement a staging promotion process for both application deploys and database changes before production rollout.
- Goal: prevent data loss and reduce production rollout risk through pre-production validation and controlled promotion.
- Scope when prioritized:
  - separate staging environment for API/web deploy validation with production-like config
  - branch-to-environment promotion strategy (for example: feature branch -> preview, `main` -> staging, version tag or release branch -> production) with explicit merge/promotion rules
  - migration workflow with explicit forward/rollback strategy and pre-deploy backup/snapshot requirements
  - promotion gates (health checks, smoke tests, migration verification) before production deploy
  - documented recovery runbook for failed rollout and partial migration states
- Add DB selection by use case (single system-of-record plus optional specialized stores).
- Goal: define when to keep Postgres-only versus when to introduce a second datastore for bounded capabilities.
- Scope when prioritized:
  - define decision thresholds for adding a second datastore (measured performance bottlenecks, capability gaps, or compliance/isolation requirements)
  - assign canonical ownership boundaries (transactional record in Postgres, specialized ownership in secondary store only where justified)
  - define environment contract for optional secondary datastores (for example `VECTOR_DATABASE_URL`, `ANALYTICS_DATABASE_URL`) while preserving `CORE_DATABASE_URL` as primary
  - require adapter/port isolation so app/domain code does not import concrete datastore SDKs directly
  - define migration and rollback playbook for introducing and removing secondary stores

## Roadmap Update Rules
- Update this file whenever a phase status changes or acceptance criteria change.
- Check Linear before planning changes; tickets can be added, removed, updated, or reprioritized outside Codex sessions.
- Keep Linear synchronized with this roadmap when current work, phase status, acceptance criteria, or immediate next actions change.
- Keep `docs/requirements-baseline.md` as the source for requirement statements and status semantics.
- For architecture-impacting roadmap changes, update `architecture/contract.json` first, regenerate `docs/architecture-canonical.md`, then update this roadmap.
