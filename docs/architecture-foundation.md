# Neutrino Architecture Foundation

## Goal
Design for an AI-first product now, without locking into one vendor or one runtime forever.  
The system should be deployable by pushing to git, regardless of later architecture swaps.

## Canonical Architecture Source
- Single source of truth: `architecture/contract.json`
- Generated architecture view: `docs/architecture-canonical.md`
- Drift check script: `scripts/check-architecture-drift.mjs`
- CI enforcement: `.github/workflows/architecture-drift.yml`

Implementation should evolve by updating the contract first, then regenerating the canonical doc.

## Contract-First Change Workflow
1. Update `architecture/contract.json`.
2. Add or update implementation files to match the new contract.
3. Regenerate the canonical doc: `node scripts/render-architecture-doc.mjs`.
4. Run conformance checks: `node scripts/check-architecture-drift.mjs`.
5. Merge only when CI architecture drift checks pass.

## Product Requirements (from current direction)
- AI-first web client + server.
- Vector-enabled data layer.
- Git service + repo management integration.
- Real-time document collaboration.
- Push-to-deploy developer workflow.

## Decision Principles
1. Prefer contracts over concrete implementations.
2. Keep state in a durable, portable core (`Postgres` first).
3. Isolate vendor dependencies behind adapters.
4. Treat deployment as code from day one (CI + IaC + migrations).
5. Make the "local -> preview -> prod" path identical where possible.

## Recommended Baseline (v1)
These are defaults, not hard locks.

### 1) App Layer
- Web client: `Next.js` (App Router) + `TypeScript`.
- Server APIs: start inside the same repo, but keep domain services in `/packages` to allow later extraction.
- Why: fast shipping now, easy split to microservices later.

### 2) Data + Vector Layer
- Primary DB: `PostgreSQL`.
- Vector search: `pgvector` in the same DB initially.
- Why: one transactional system, fewer moving parts, easier ops.
- Swap path later: dedicated vector engine (`Qdrant`, `Pinecone`, etc.) behind a vector adapter interface.

### 3) AI Layer
- Add an internal AI gateway module that standardizes:
  - chat completions
  - embeddings
  - tool calls
  - model routing + fallback
- Why: avoids hard-coupling app code to any single model API.

### 4) Realtime Collaboration
- Collaboration model: CRDT (`Yjs`) for document state.
- Transport: managed realtime service first (or websocket service), persisted snapshots in Postgres/object storage.
- Why: proven merge model, offline/edit concurrency, clear portability.

### 5) Git / Repo Management
- Start with GitHub App integration:
  - OAuth/App auth
  - repo install + permissions
  - webhooks for push/PR/status
- Use provider adapters so GitLab/Bitbucket can be added without rewriting domain logic.

## Push-to-Deploy Contract (Architecture-Agnostic)
Every deployable repo should implement these invariant interfaces:

1. Build contract:
- `Dockerfile` (single canonical build target for server/client workloads).
- `Makefile` or `justfile` with `build`, `test`, `migrate`, `start`.

2. Runtime contract:
- Strict env schema (`.env.example` + runtime validation).
- Health endpoints (`/healthz`, `/readyz`).

3. Data contract:
- Versioned migrations (`migrations/`).
- Seed strategy for local and preview environments.

4. Delivery contract:
- GitHub Actions pipeline:
  - `ci` on PR (lint/test/typecheck)
  - `deploy-preview` on PR
  - `deploy-prod` on main (with approvals if needed)
- IaC for environments (`infra/terraform` or equivalent).

If these contracts are stable, architecture internals can change without changing developer workflow.

## Suggested Repository Shape
```text
/
  apps/
    web/
    api/
  packages/
    ai-gateway/
    vector-store/
    collab/
    git-provider/
    shared/
  infra/
    terraform/
  migrations/
  .github/workflows/
  docs/
```

## Key Interfaces to Define Early
- `AIProvider`: `generate()`, `embed()`, `stream()`, `toolCall()`
- `VectorStore`: `upsert()`, `query()`, `deleteByNamespace()`
- `CollabStore`: `loadDoc()`, `appendUpdate()`, `snapshot()`
- `RepoProvider`: `listRepos()`, `createBranch()`, `openPR()`, `commitFiles()`

These interfaces are the main flexibility levers.

## First Technical Decisions to Lock (Now)
1. Monorepo with `apps/*` + `packages/*`.
2. Postgres + pgvector as initial persistence.
3. Yjs-based collaboration model.
4. GitHub-first provider adapter.
5. GitHub Actions + IaC-driven deploy pipeline.

## Decisions to Defer (Later)
- Exact cloud vendor.
- Specific managed DB provider.
- Specific websocket/realtime vendor.
- Whether to split API into separate services.

## Near-Term Implementation Plan
1. Scaffold monorepo structure and shared package boundaries.
2. Add CI workflow with required checks.
3. Add deploy workflow that triggers from `main`.
4. Add migration tooling + first schema.
5. Add adapter stubs for AI, vector, collaboration, and git providers.
