# Neutrino Implementation Roadmap

Last updated: 2026-05-18
Owner: Platform engineering
Primary status source: this file

## Scope and Source of Truth
This roadmap tracks implementation execution for the approved Neutrino platform plan.

Related sources:
- Requirements baseline: `docs/requirements-baseline.md`
- Canonical architecture contract: `architecture/contract.json`
- Generated architecture view: `docs/architecture-canonical.md`
- Platform/deployment assumptions: `docs/platform-baseline.md`, `docs/deployment-baseline.md`

Out of scope for this phase:
- `docs/data-structure-ref/`

## Status Legend
- `Planned`: agreed but not started
- `In Progress`: active implementation
- `Blocked`: cannot proceed until dependency/decision is resolved
- `Done`: implemented and validated against acceptance criteria

## Phase Tracker

| Phase | Name | Status | Exit Criteria |
| --- | --- | --- | --- |
| 1 | Rename and Restructure Foundation | Done | `packages/contracts` removed, `schema/ports/core` shape adopted, imports updated, architecture check + typecheck pass |
| 2 | Core Persistence (Postgres canonical) | In Progress | `@neutrino/core` repositories + migrations in place, production-managed Postgres provisioning + secret wiring + migration promotion flow validated |
| 3 | Infrastructure Ports and Adapters | In Progress | baseline adapters wired for model, embedding/vector, object storage, identity/session, policy |
| 4 | Catalog, Bindings, and Manifests | In Progress | manifests validate, resources register, bindings resolve runtime plan |
| 5 | Auth and Data Platform | In Progress | login/session flow works, memory/artifact/vector persistence validated |
| 6 | Dev Agent Runtime | Planned | end-to-end runtime path persists run, trace, usage/cost, memory access, eval output |
| 7 | Service Donation and Control-Plane UI | Planned | cross-app capability donation/authorization validated and surfaced in UI |

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
Status: `In Progress`

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
- Migration runner and status commands exist in `@neutrino/core` (`npm run migrate --workspace @neutrino/core` and `npm run migrate:status --workspace @neutrino/core`) using `CORE_DATABASE_URL` (or `DATABASE_URL`).
- Validated on a clean local Postgres 17 instance with pgvector extension (`platform_stage` / `platform_user`), with migration `0001_core_foundation` applied and no pending migrations.
- Runtime secret wiring and migration execution hooks are now defined in deployment IaC (`CORE_DATABASE_URL` secret binding + Cloud Run migration job + Cloud Build execution before service rollout).
- Self-managed prototype Postgres now has Terraform scaffolding: Compute Engine VM, separate persistent data disk with destroy prevention, `pgvector/pgvector:pg17` container, Secret Manager password lookup, firewall rule, and Serverless VPC Access connector for Cloud Run.
- Remaining Phase 2 closure work: apply/validate the GCP Postgres infrastructure, populate required secrets, verify backup/restore drill, and validate staging-to-production migration promotion.

### Phase 2 Prototype Profile (Temporary)
- During concept validation, use self-managed Postgres + pgvector for staging/prod-like environments.
- Keep the boundary portable:
  - runtime uses only `CORE_DATABASE_URL`/`DATABASE_URL`
  - no hardcoded provider-specific host/user naming in application code
- Prototype deployment target:
  - Postgres runs on a Terraform-managed Compute Engine VM, not Cloud Run.
  - Cloud Run connects over a Serverless VPC Access connector.
  - `CORE_DATABASE_URL` uses the VM private IP from Terraform output `postgres_internal_ip`.
- Minimum required controls before calling Phase 2 complete:
  - separate staging and production databases
  - automated backup policy and at least one verified restore drill
  - migration promotion path: staging migrate -> validate -> production backup -> production migrate
  - documented rollback/recovery runbook for partial migration failures
- Exit criterion from prototype profile:
  - retain ability to switch to managed Postgres later without application-layer rewrites.

### Phase 3: Infrastructure Ports and Adapters
Status: `In Progress`

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
- Object and policy adapter directories are present in working tree and need completion verification.

### Phase 4: Catalog, Bindings, and Manifests
Status: `In Progress`

Target outcomes:
- Manifest set under `@neutrino/schema`:
  - `pico.app`, `pico.service`, `pico.agent`, `pico.skill`, `pico.harness`, `pico.capability`, `pico.conversation`, `pico.eval`, `pico.binding`, `pico.policy`
- Catalog services in place:
  - `ServiceCatalog`, `CapabilityCatalog`, `OAuthClientCatalog`
- `BindingResolver` produces runtime-resolved execution selections.

Validation:
- Dev agent app manifest validates, registers, and resolves through bindings.

Current notes:
- In-memory catalog adapters are renamed in working tree; final behavior validation remains open.

### Phase 5: Auth and Data Platform
Status: `In Progress`

Target outcomes:
- Session-backed auth with real login page (no HTTP Basic Auth).
- Local username/password implementation available.
- Migration path preserved for Ory Kratos and SSO.
- Postgres + pgvector in first implementation slice.
- Artifact bytes in `ObjectStorage`; metadata in repository.
- Canonical memory in repository with searchable indexing through memory index.

Validation:
- Login/session tests pass
- Memory/artifact/vector tests pass

Current notes:
- Login/session/admin surfaces exist; continue hardening and coverage.

### Phase 6: Dev Agent Runtime
Status: `Planned`

Target outcomes:
- Own runtime (no Vercel AI SDK).
- Path implemented:
  `Tenant -> Project -> App manifest -> Agent service -> Skill -> Harness service -> LLM binding -> Conversation runtime -> Run record -> Trace -> Eval result`
- Harness governs context, permissions, policy, capabilities, limits, memory, tracing, eval hooks.

Validation:
- Admin/debug route executes full path and persists run/trace/usage/memory/eval outputs.

### Phase 7: Service Donation and Control-Plane UI
Status: `Planned`

Target outcomes:
- First donated Dev-agent capability available through catalog+bindings.
- Authorization boundary enforced for consumer access.
- UI reflects persisted catalog/binding/run/trace/usage/memory/artifact state.

Validation:
- Authorized consumer succeeds; unauthorized consumer denied.
- UI inspection confirms persisted lifecycle visibility.

## Open-Source Evaluations (Post-MVP or Conditional)
- Identity: Ory Kratos (and later SSO provider integration)
- Authorization: OpenFGA
- Durable workflows: Temporal or Inngest
- Memory backends: Mem0, Zep/Graphiti, Letta
- Vector backend alternatives: Qdrant or Pinecone

## Immediate Next Actions
1. Finalize Phase 1 closure checklist and commit the package-structure migration as an atomic baseline.
2. Complete Phase 2 repository + migration harness validation on a clean Postgres instance.
3. Close Phase 3 adapter test gaps for object storage, policy engine, and vector/index behavior.
4. Implement a minimum Phase 4 binding resolution test that drives a Dev-agent manifest through catalog registration and runtime resolution.
5. Convert current auth and memory/artifact work into explicit Phase 5 acceptance tests.

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

## Roadmap Update Rules
- Update this file whenever a phase status changes or acceptance criteria change.
- Keep `docs/requirements-baseline.md` as the source for requirement statements and status semantics.
- For architecture-impacting roadmap changes, update `architecture/contract.json` first, regenerate `docs/architecture-canonical.md`, then update this roadmap.
