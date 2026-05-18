# Neutrino Requirements Baseline

## Purpose
This document is the single source for Neutrino requirement statements and requirement status.
It translates accepted product direction from Notion into repo-owned implementation planning input.

Use this document to separate:
- confirmed requirements already implied by the current repo contract, docs, or delivery rules
- accepted first-implementation requirements that are ready to plan
- deferred requirements that should not block the first implementation plan
- open questions that still need a product decision

Related architecture documents:
- Canonical architecture contract: `architecture/contract.json`
- Generated architecture view: `docs/architecture-canonical.md`
- Architecture rationale and decision history: `docs/architecture-foundation.md`
- Agent-facing repo rules: `AGENTS.md`

Requirement statements and statuses must be maintained here, not in architecture rationale docs.

## Source Inputs
- `architecture/contract.json`
- `docs/architecture-foundation.md`
- `docs/deployment-baseline.md`
- `docs/platform-baseline.md`
- `README.md`
- `AGENTS.md`
- Notion: `Pico Agent Redux`
- Notion: `Product Vision Capture`
- Notion: `Codex Repo Sync`

Do not use `docs/data-structure-ref/` for this phase. Those files are reserved for later task, calendar, and item data-structure design.

## Requirement Status Legend
- `Confirmed`: already implied by the current repo contract, docs, or delivery rules
- `Accepted`: product direction is settled enough to plan implementation
- `Deferred`: intentionally out of the first implementation plan
- `Open`: not sufficiently defined yet

## Product Goal
Build picoAI as a composable AI service platform: a system for defining, running, reusing, and governing AI systems through simple files, stable schema and ports, tenant-safe execution, and builder UIs that operate as control planes over the same resources.

## Confirmed Requirements

### Existing Functional Baseline
| ID | Status | Requirement |
| --- | --- | --- |
| FR-001 | Confirmed | The system must provide a web client in `apps/web` built with Next.js App Router. |
| FR-002 | Confirmed | The system must provide an API service in `apps/api` that exposes `/v1/chat`, `/healthz`, and `/readyz`. |
| FR-003 | Confirmed | The web app must proxy chat requests through its own `/api/chat` surface rather than calling model providers directly. |
| FR-004 | Confirmed | Application code must interact with infrastructure through ports rather than direct adapter imports. |
| FR-005 | Confirmed | The frontend must use the shared design system in `packages/ui`, built on `shadcn/ui`, instead of introducing a second component system. |
| FR-006 | Confirmed | The system must support swappable AI providers behind the `LanguageModelProvider` port. |
| FR-007 | Confirmed | The system must preserve adapter boundaries for vector storage, collaboration storage, repo providers, identity, sessions, OAuth client catalog, and capability catalog. |

### Existing Deployment and Runtime
| ID | Status | Requirement |
| --- | --- | --- |
| NFR-001 | Confirmed | The web client must be deployable to Vercel. |
| NFR-002 | Confirmed | The API must be deployable to Cloud Run and remain portable to App Runner through a standard Docker runtime contract. |
| NFR-003 | Confirmed | The API runtime must stay stateless and container-portable. |
| NFR-004 | Confirmed | Infrastructure configuration must remain explicit and managed through CI and IaC rather than hand-configured runtime changes. |
| NFR-005 | Confirmed | Environment contracts must be explicit, validated at runtime, and documented through named variables. |
| NFR-006 | Confirmed | Health and readiness probes must remain available for deployable services. |
| NFR-007 | Confirmed | Architecture-affecting changes must update `architecture/contract.json` first and regenerate `docs/architecture-canonical.md`. |

## Accepted First-Implementation Requirements

### Product Model
| ID | Status | Requirement |
| --- | --- | --- |
| PR-001 | Accepted | Services are the core reusable platform unit. Apps are user-facing surfaces and control planes over services. |
| PR-002 | Accepted | Builder UIs must produce and edit the same file-defined resources that can be edited directly. They must not create hidden app-specific resource structures. |
| PR-003 | Accepted | The initial platform grammar must include app manifests, service definitions, service bindings, capability definitions, agent definitions, skill definitions, harness definitions, conversation definitions, eval definitions, policy definitions, tenant scope, and run records. |
| PR-004 | Accepted | The first implementation milestone should prove one vertical path: tenant -> project -> app manifest -> agent service -> skill -> harness service -> LLM binding -> conversation runtime -> run record -> trace -> eval result. |
| PR-005 | Accepted | The first implementation should support service donation: one app can expose a reusable service or capability that another app or agent can consume through the catalog. |

### Platform Core
| ID | Status | Requirement |
| --- | --- | --- |
| PK-001 | Accepted | The platform core must own tenant-safe durable records for tenants, organizations, teams, projects, users, groups, roles, policies, app installations, services, service versions, capabilities, invocations, artifacts, memory, events, runs, traces, audit events, usage, and cost. |
| PK-002 | Accepted | Every core durable object must carry enough scope metadata to support tenant, organization, team, project, app installation, service, agent, harness, conversation, run, artifact, and user boundaries. |
| PK-003 | Accepted | Authorization must cover user-to-service and service-to-service access decisions. |
| PK-004 | Accepted | The catalog/resolver must validate manifests, register resources, resolve required services against bindings, select versions, check permissions, and produce a runtime execution plan. |

### Auth and Identity
| ID | Status | Requirement |
| --- | --- | --- |
| AUTH-001 | Accepted | Auth must be part of the first serious implementation run under `auth.pico.ai`. |
| AUTH-002 | Accepted | Product authentication must use a real login page, not HTTP Basic Auth. |
| AUTH-003 | Accepted | The first auth backend may be local username/password to unblock development and internal usage. |
| AUTH-004 | Accepted | Auth must stay behind ports and adapters so the backend can move to Ory Kratos. |
| AUTH-005 | Accepted | SSO must be planned through identity, authenticator, directory, and policy provider ports rather than feature-code rewrites. |
| AUTH-006 | Accepted | Admin Console and builder surfaces must be session-backed. |

### Data, Memory, and Artifacts
| ID | Status | Requirement |
| --- | --- | --- |
| DATA-001 | Accepted | Postgres must be installed and hosted as part of the core system from the first serious implementation run. |
| DATA-002 | Accepted | pgvector must be installed with Postgres for the first vector/retrieval implementation. |
| DATA-003 | Accepted | pgvector is the initial vector implementation, not a permanent platform assumption. |
| DATA-004 | Accepted | Vector and retrieval access must remain behind replaceable ports so Qdrant, Pinecone, object storage indexes, or external retrieval APIs can be introduced later. |
| DATA-005 | Accepted | The platform needs a core memory system for explicit, scoped, auditable memory records. Vector-only memory is not the canonical memory structure. |
| DATA-006 | Accepted | The platform needs a ObjectStorage and artifact repository concept. ObjectStorage owns original bytes and generated binary assets; Postgres owns metadata, references, permissions, provenance, and retention state. |
| DATA-007 | Accepted | Images, thumbnails, exports, eval datasets, trace attachments, generated files, and uploaded documents must use the artifact/ObjectStorage path, even when small. |

### Harness, Conversation, and Evaluation
| ID | Status | Requirement |
| --- | --- | --- |
| HCE-001 | Accepted | A harness is a reusable operational environment around one or more agents, not merely an eval runner. |
| HCE-002 | Accepted | Harnesses must be able to describe runtime settings, mounted skills, mounted tools/capabilities, context sources, permission scope, lifecycle behavior, policy enforcement, approvals, retries, state/memory access, logging, tracing, deployment hooks, and attached evals. |
| HCE-003 | Accepted | Conversations must be a reusable runtime primitive for humans and one or more agents, not a one-off chat UI feature. |
| HCE-004 | Accepted | Evals are validation and governance modules attached to agents, harnesses, conversations, services, and apps. |

## Deferred From First Implementation
- Marketplace or public ecosystem distribution.
- Physical microservice extraction beyond concrete deployment need.
- Full workflow automation platform.
- Enterprise SSO and SCIM implementation, beyond contract shape and migration path.
- Dedicated vector engine as the default before pgvector proves insufficient.
- General task, calendar, or item data modeling from `docs/data-structure-ref/`.

## Explicit Constraints
- Keep the first implementation as a modular monolith with service semantics, stable schema and ports, catalog-backed discovery, explicit invocation boundaries, replaceable adapters, and a shared runtime.
- Do not import concrete infrastructure adapters directly from app or domain code.
- Do not introduce a second frontend component library.
- Do not create page-specific token systems for spacing, color, typography, or radius.
- Do not couple feature logic to a single cloud runtime when the contract expects Cloud Run and App Runner portability.
- Do not put blob bytes in Postgres except for tiny metadata or structured records.
- Do not implement Agent Builder, Harness Builder, or Service Builder as isolated systems with private resource structures.

## Open Questions for the Implementation Plan
1. What is the exact first demo app/service domain used to prove service donation?
2. Which minimal manifest schemas are required for the first vertical path, and which fields are intentionally deferred?
3. Which local object-store adapter should be used for development before selecting production S3/GCS/R2 backing?
4. What minimal eval should gate the first vertical path?
5. What exact cost attribution granularity is required in the first milestone?
