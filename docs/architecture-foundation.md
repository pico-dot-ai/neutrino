# Neutrino Architecture Foundation

## Purpose
This document is a short rationale and decision-history reference for why the current architecture direction exists.

It is not the requirements ledger and it is not the canonical architecture contract.

## Canonical Sources
- Canonical architecture contract: `architecture/contract.json`
- Generated canonical architecture view: `docs/architecture-canonical.md`
- Requirements and status ledger: `docs/requirements-baseline.md`

If there is any mismatch, `architecture/contract.json` is the source of truth.

## Decision History (Condensed)

### 2026-04 Baseline Direction
- Chose a contract-first architecture to allow provider/runtime swaps without rewriting app code.
- Chose adapters behind ports for AI, vector, collaboration, and repo integrations.
- Chose explicit deployability and IaC guardrails so delivery stays push-to-deploy.

### 2026-05 Platform Expansion
- Extended architecture boundaries around internal platform concerns (`pico_app_id`, identity/session/OAuth/capability surfaces).
- Kept the same rule: app/domain code imports contracts, not concrete adapters.

## Stable Decision Rationale
1. Contracts reduce churn by isolating vendor/runtime changes.
2. Adapter boundaries preserve portability and keep feature code cleaner.
3. Explicit delivery contracts (health checks, env validation, CI/IaC) reduce operational ambiguity.

## Change Workflow (Architecture)
1. Update `architecture/contract.json`.
2. Regenerate `docs/architecture-canonical.md`.
3. Validate drift checks before merge.

For requirement definitions, statuses, constraints, and open product questions, use `docs/requirements-baseline.md`.
