# Neutrino Architecture Foundation

## Purpose
This document is the short rationale and decision-history reference for why the current architecture direction exists.

It is not the requirements ledger and it is not the canonical architecture contract.

## Canonical Sources
- Canonical architecture contract: `architecture/contract.json`
- Generated canonical architecture view: `docs/architecture-canonical.md`
- Requirements and status ledger: `docs/requirements-baseline.md`
- Platform baseline: `docs/platform-baseline.md`
- Agent working rules: `AGENTS.md`

If there is any mismatch, `architecture/contract.json` is the source of truth for architecture constraints and `docs/requirements-baseline.md` is the source of truth for requirement status.

## Decision History

### 2026-04 Baseline Direction
- Chose a schema-and-ports-first architecture to allow provider/runtime swaps without rewriting app code.
- Chose adapters behind ports for AI, vector, collaboration, and repo integrations.
- Chose explicit deployability and IaC guardrails so delivery stays push-to-deploy.

### 2026-05 Internal Platform Expansion
- Extended architecture boundaries around internal platform concerns: `app_id`, identity, sessions, OAuth client catalog, capability catalog, admin console, login flow, and debug tooling.
- Kept the same rule: app/domain code imports schema and ports, not concrete adapters.

### 2026-05 Composable AI Service Platform Direction
- Reframed picoAI from primarily an agent builder into a composable AI service platform.
- Chose the principle: apps publish objects, actions, views, and visibility; services compose as reusable implementation units behind actions.
- Chose service package identity as namespaced and versioned, in the form `@scope/service-name@version`.
- Reserved `@pico/*` for first-party platform services and defaults; workspace/company namespaces such as `@acme/*` identify company-owned services.
- Chose the minimum internal kernel: Workspace, Org, Project, Actor, Group, Identity, Grant, App, Object, Action, Service, Policy, Schema, Binding, Execution, and Record.
- Kept `capability` and `operation` subordinate to service interface details instead of primary product nouns.
- Chose a Unix-style access model: actors perform work, groups model structure, identities link SSO/login/API credentials to actors, and grants attach visibility/access to actors or groups.
- Accepted file-defined resources as the shared resource structure between direct editing and builder UIs.
- Accepted harnesses as reusable operational environments around agents, not eval runners.
- Accepted conversations as reusable human and multi-agent runtime primitives.
- Accepted auth, Postgres, pgvector, core memory, blob/artifact storage, run records, traces, usage, cost, and audit records as first-run platform-core concerns.
- Service definitions are not Docker-like container packaging specs in the current plan. Image, entrypoint, port, healthcheck, compose, and sidecar details are implementation/runtime/binding details to add only when a concrete runtime need exists.
- Execution rules are part of the architecture boundary: no execution without actor, no record without scope, no retrieval without policy, no service without version, no binding without snapshot, and no output without schema.

### 2026-05 Recipe and Template Boundary
- Recipes and templates are useful scaffolding conveniences, but they are not first-class product artifacts in the current plan of record.
- They should not be exposed as services or treated as core runtime resources.
- Their concrete representation and UX are deferred until the service, policy, binding, execution, and record loop is proven.

## Stable Decision Rationale
1. Contracts reduce churn by isolating vendor/runtime changes.
2. Adapter boundaries preserve portability and keep feature code cleaner.
3. File-defined resources prevent builder UIs from creating hidden resource structures that agents and services cannot reuse.
4. A modular monolith with service semantics lets the project prove composition before paying the cost of physical microservices.
5. Auth, storage, memory, artifacts, policy, and observability must be designed as platform services early because they define workspace safety and operational trust.
6. ObjectStorage should own artifact bytes while Postgres owns metadata and access control; this keeps backups, retention, delivery, and indexing manageable.

## Change Workflow
1. Product direction starts in Notion.
2. Accepted requirements move into `docs/requirements-baseline.md`.
3. Architecture-affecting changes update `architecture/contract.json`.
4. Regenerate `docs/architecture-canonical.md`.
5. Update `docs/platform-baseline.md`, `docs/deployment-baseline.md`, or `README.md` only where their ownership applies.
6. Validate drift checks before merge.

For task, calendar, and generalized item data structures, defer to a later data-modeling pass that may use `docs/data-structure-ref/`.
