# Neutrino Requirements Baseline

## Purpose
This document establishes the initial requirements baseline for Neutrino.
It is intended to support product scoping, ticket creation, and architecture decisions without treating every early idea as a locked commitment.

Use this document to separate:
- confirmed requirements that already follow from the current repo contract
- proposed requirements that appear to be part of the current product direction
- open questions that still need an explicit product decision

`architecture/contract.json` remains the canonical source for architecture boundaries.

## Source Inputs
- `README.md`
- `architecture/contract.json`
- `docs/architecture-foundation.md`
- `docs/deployment-baseline.md`
- `apps/web/README.md`
- `apps/api/README.md`

## Requirement Status Legend
- `Confirmed`: already implied by the current repo contract, docs, or delivery rules
- `Proposed`: consistent with the current direction, but should still be confirmed by product ownership
- `Open`: not sufficiently defined yet

## Product Goal
Build an AI-first product in a monorepo that can ship quickly now while preserving the ability to swap infrastructure providers later through contract-first boundaries.

## Confirmed Requirements

### Functional Baseline
| ID | Status | Requirement |
| --- | --- | --- |
| FR-001 | Confirmed | The system must provide a web client in `apps/web` built with Next.js App Router. |
| FR-002 | Confirmed | The system must provide an API service in `apps/api` that exposes `/v1/chat`, `/healthz`, and `/readyz`. |
| FR-003 | Confirmed | The web app must proxy chat requests through its own `/api/chat` surface rather than calling model providers directly. |
| FR-004 | Confirmed | Application code must interact with AI, vector, collaboration, and repo integrations through contract ports rather than direct adapter imports. |
| FR-005 | Confirmed | The frontend must use the shared design system in `packages/ui`, built on `shadcn/ui`, instead of introducing a second component system. |
| FR-006 | Confirmed | The system must support swappable AI providers behind the `AIProvider` contract. |
| FR-007 | Confirmed | The system must preserve adapter boundaries for vector storage, collaboration storage, and repo providers even if only one adapter is active at runtime. |

### Deployment and Runtime
| ID | Status | Requirement |
| --- | --- | --- |
| NFR-001 | Confirmed | The web client must be deployable to Vercel. |
| NFR-002 | Confirmed | The API must be deployable to Cloud Run and remain portable to App Runner through a standard Docker runtime contract. |
| NFR-003 | Confirmed | The API runtime must stay stateless and container-portable. |
| NFR-004 | Confirmed | Infrastructure configuration must remain explicit and managed through CI and IaC rather than hand-configured runtime changes. |
| NFR-005 | Confirmed | Environment contracts must be explicit, validated at runtime, and documented through named variables. |
| NFR-006 | Confirmed | Health and readiness probes must remain available for deployable services. |
| NFR-007 | Confirmed | The developer workflow must support push-to-deploy through CI-managed delivery. |

### Delivery Quality
| ID | Status | Requirement |
| --- | --- | --- |
| DQ-001 | Confirmed | Architecture-affecting changes must update `architecture/contract.json` before implementation and regenerate `docs/architecture-canonical.md`. |
| DQ-002 | Confirmed | Behavior changes should add or update tests when the surface is stable enough to test. |
| DQ-003 | Confirmed | Feature code must not embed infrastructure-specific behavior that belongs in deployment or adapter layers. |
| DQ-004 | Confirmed | The project should prefer the simplest solution that satisfies the current requirement and avoid speculative abstractions. |

## Proposed Initial Product Requirements
These appear to be part of the current direction, but they should be explicitly confirmed before they are treated as launch-blocking.

| ID | Status | Requirement |
| --- | --- | --- |
| PR-001 | Proposed | The first release should center on an AI-first user workflow rather than a generic CRUD application. |
| PR-002 | Proposed | The initial data layer should use Postgres as the durable system of record. |
| PR-003 | Proposed | The initial vector capability should use `pgvector` before introducing a dedicated vector engine. |
| PR-004 | Proposed | The product should support a vector-enabled retrieval workflow in the initial platform baseline. |
| PR-005 | Proposed | The product should support Git provider integration through a repo-provider abstraction, starting with GitHub. |
| PR-006 | Proposed | The product should support real-time document collaboration through a collaboration contract, likely using a Yjs-based model. |
| PR-007 | Proposed | The AI layer should expose standardized generation, embedding, streaming, and tool-calling capabilities behind a shared gateway. |

## Explicit Constraints
These are important because they rule out several tempting but suboptimal implementation shortcuts.

- Do not import concrete infrastructure adapters directly from app or domain code.
- Do not introduce a second frontend component library.
- Do not create page-specific token systems for spacing, color, typography, or radius.
- Do not couple feature logic to a single cloud runtime when the contract already expects Cloud Run and App Runner portability.
- Do not add persistence, microservices, or generic abstraction layers without a concrete second use case.

## Initial Out-of-Scope Items
These should stay out of the first delivery slice unless a later decision explicitly changes scope.

- Multiple independent frontend design systems
- Vendor-specific feature code paths outside adapter or deployment layers
- Premature service extraction from the monorepo into separate deployables
- Hand-managed runtime configuration as a replacement for IaC
- Broad platform features that are not tied to a concrete first user workflow

## Open Questions
These need product decisions before the requirements baseline can become a release plan.

1. Who is the primary user for the first release, and what is the single most important job they need Neutrino to do?
2. What is the first end-to-end user journey that must work in production?
3. Is vector-backed retrieval required for the first release, or only for a later phase?
4. Are Git integration and real-time collaboration launch requirements or follow-on capabilities?
5. What authentication and authorization model is required for the first release?
6. What durable data entities must exist in Postgres at launch?
7. What latency, throughput, reliability, and cost targets matter for the first production milestone?
8. What level of auditability or conversation history retention is required?

## Recommended Next Step
Use this document as the baseline for turning assumptions into explicit decisions.
The next useful revision would be to convert the `Proposed` and `Open` sections into:
- a confirmed first-release scope
- a deferred-later list
- measurable acceptance criteria for the first production milestone
