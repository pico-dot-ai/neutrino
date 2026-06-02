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
- Auth baseline and OpenFGA mapping: `docs/auth-baseline.md`
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
Build picoAI as a composable AI service platform: a system for defining, running, reusing, and governing AI systems through simple files, stable schema and ports, workspace-safe execution, and builder UIs that operate as control planes over the same resources.

## Confirmed Requirements

### Existing Functional Baseline
| ID | Status | Requirement |
| --- | --- | --- |
| FR-001 | Confirmed | The system must provide a web client in `apps/web` built with Next.js App Router. |
| FR-002 | Confirmed | The system must provide an API service in `apps/api` that exposes `/v1/chat`, `/health`, and `/readyz`. |
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
| PR-001 | Accepted | Apps are the developer-facing product artifact. Apps publish objects, actions, views, and visibility rules; services are reusable implementation units behind app actions. |
| PR-002 | Accepted | Builder UIs must produce and edit the same file-defined resources that can be edited directly. They must not create hidden app-specific resource structures. |
| PR-003 | Accepted | The initial platform grammar must center on apps, objects, actions, views, visibility, services, policies, schemas, bindings, executions, and records, with agents, skills, tools, evals, traces, artifacts, runtimes, workflows, and capabilities kept subordinate unless implementation proves they must be promoted. |
| PR-004 | Accepted | The first implementation milestone should prove one vertical path: workspace -> project -> app manifest -> object/action -> service -> skill -> binding -> conversation runtime -> execution record -> trace -> eval result. |
| PR-005 | Accepted | The first implementation should support service reuse behind actions: one app can expose an action that uses a versioned service package, including services donated by other apps when visibility and grants allow it. |
| PR-006 | Accepted | Recipes and templates are deferred scaffolding conveniences, not first-class product artifacts, exposed services, or core runtime resources in the current plan of record. |
| PR-007 | Accepted | Developer-facing product vocabulary should emphasize apps, objects, actions, views, handlers, visibility, policies, and history. Services remain visible to developers as reusable implementation packages, but are not the primary app surface. |
| PR-008 | Accepted | Services must use package-style namespaced identity in the shape `@scope/service-name@version`; `@pico/*` is reserved for first-party platform services and workspace/company namespaces such as `@acme/*` identify company-owned services. |
| PR-009 | Accepted | Durable shared services should generally use owner or workspace namespaces rather than app namespaces; app-private generated services may exist only when explicitly marked private or project-scoped. |
| PR-010 | Accepted | Service manifests are not Docker-like or OCI-like packaging specs; image, entrypoint, port, healthcheck, compose, and sidecar details are deferred implementation/runtime/binding concerns behind `Service`. |

### Platform Core
| ID | Status | Requirement |
| --- | --- | --- |
| PK-001 | Accepted | The platform core must own durable records for workspaces, orgs, projects, actors, groups, identities, grants, policies, app packages, app versions, app installations, object types, app objects, action definitions, services, service versions, bindings, executions, records, artifacts, memory, traces, audit events, usage, and cost. |
| PK-002 | Accepted | Every core durable object must carry enough scope metadata to support workspace, org, group, project, app installation, service, agent, harness, conversation, execution, artifact, and actor boundaries. |
| PK-003 | Accepted | Authorization must cover actor-to-app, actor-to-action, actor-to-object, actor-to-service, and service-to-service access decisions. |
| PK-004 | Accepted | The catalog/resolver must validate manifests, register resources, resolve required services against bindings, select versions, check permissions, and produce a runtime execution plan. |
| PK-005 | Accepted | The platform must provide a scoped manifest registry/catalog so each app, object, action, view, service, agent, skill, harness, conversation, eval, binding, and policy manifest can be created, versioned, listed, resolved, and audited across workspaces, orgs, groups, projects, app installations, and actors. |
| PK-006 | Accepted | A `pico.service` manifest must support service package name, version, summary, input/output schema references, policy, tools used, skills followed, emitted record types, and optional subordinate service interface functions. A `pico.app` manifest must support objects, actions, views, handlers, and visibility. |
| PK-007 | Accepted | Every execution must reference action ID where applicable, service package name and version, actor, applicable scope, policy snapshot, binding snapshot, schema versions, and tool/service dependency versions where applicable. |
| PK-008 | Accepted | Bindings must be snapshot-capable so executions can reference the concrete provider, tool, resource, or service dependency resolution used at execution time. |
| PK-009 | Accepted | Records must be append-only typed JSONL facts emitted during execution, schema-validated by record type, and scoped to workspace/project/actor/action/service context. |
| PK-010 | Accepted | Retrieval must never bypass policy; vector rows derived from restricted records or artifacts must inherit equivalent workspace, scope, classification, and visibility restrictions. |

### Auth and Identity
| ID | Status | Requirement |
| --- | --- | --- |
| AUTH-001 | Accepted | Auth must be part of the first serious implementation run under `auth.pico.ai`. |
| AUTH-002 | Accepted | Product authentication must use a real login page, not HTTP Basic Auth. |
| AUTH-003 | Accepted | Ory/Kratos is the accepted authentication and session-management target; local username/password may remain only as a development, bootstrap, or emergency fallback until Ory/Kratos is implemented. |
| AUTH-004 | Accepted | Auth must stay behind ports and adapters while the backing implementation moves to Ory/Kratos. |
| AUTH-005 | Accepted | SSO must be planned through identity, authenticator, directory, and policy provider ports rather than feature-code rewrites. |
| AUTH-006 | Accepted | Admin Console and builder surfaces must be session-backed. |
| AUTH-007 | Accepted | OpenFGA is the durable runtime authorization model behind `PolicyEngine`; Ory Keto/Permissions is a related Zanzibar-style option but is not the selected runtime authorization engine. |
| AUTH-008 | Accepted | Current Neutrino grants remain source inputs, audit metadata, and local/bootstrap records that sync into OpenFGA relationship tuples during the authz implementation. |
| AUTH-009 | Accepted | No permission builder is included in the current plan; future builder forms must project to OpenFGA models and relationship tuples and must not create a second permission language. |
| AUTH-010 | Accepted | Tenant user management must support creating, inviting, linking, disabling, and auditing users across workspaces/orgs through Neutrino actor, identity, group, and grant records backed by Kratos authentication; tenant membership and access must not be stored in Kratos traits or metadata. |

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
- First-class recipe or template product surfaces; recipes/templates may remain handy scaffolding mechanisms, but their representation and UX are deferred.
- Enterprise SSO and SCIM implementation, beyond the Ory/Kratos migration path and identity mapping contract.
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
- Do not model service definitions as container packaging specs before a concrete runtime need exists.
- Do not model member, team_member, role, or permission_set as first-cut schema primitives.
- Do not allow execution without actor, record without scope, retrieval without policy, service without version, binding without snapshot, or output without schema.

## Open Questions for the Implementation Plan
1. Resolved: the first demo app/service domain used to prove service donation is the Dev Agent vertical.
2. Which minimal manifest schemas are required for the first vertical path, and which fields are intentionally deferred?
3. Which local object-store adapter should be used for development before selecting production S3/GCS/R2 backing?
4. What minimal eval should gate the first vertical path?
5. What exact cost attribution granularity is required in the first milestone?
