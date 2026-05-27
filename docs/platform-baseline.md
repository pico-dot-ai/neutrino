# Platform Baseline

Current Starter Version UUID: `019e3909-5457-7a5e-a5ad-4eae2ca882d9`

## Purpose
This document tracks the Neutrino platform baseline and the exact `pico-app-container` starter snapshot that app developers should use.

## Starter Version Mapping Policy
- The UUID in this file must match:
  - `pico-app-container/VERSION.uuid`
  - `pico-app-container/README.md`
- If `pico-app-container/` changes, generate a new UUIDv7 and update all three locations in the same PR.
- CI enforces this synchronization.

## Platform Baseline
Neutrino is moving toward a composable AI service platform with a modular-monolith implementation posture.

Baseline principles:
- Apps are developer-facing product packages that expose objects, actions, views, and visibility.
- Services are reusable implementation units behind app actions.
- Builder UIs must operate on the same file-defined resources that can be edited directly.
- Service semantics come before physical service extraction.
- Workspace safety, auth, storage, artifacts, memory, observability, and policy are platform core concerns.

## First-Run Platform Core
The first serious implementation plan should include:
- Hosted auth surface at `auth.pico.ai`
- Real login page, not HTTP Basic Auth
- Ory/Kratos as the accepted authentication and session-management target
- Local username/password adapter only for development, bootstrap, and emergency fallback until Ory/Kratos is implemented
- SSO path through identity, authenticator, directory, and policy ports
- OpenFGA as the accepted durable runtime authorization model behind `PolicyEngine`
- Current grants as source inputs, audit metadata, and local/bootstrap records that sync into OpenFGA relationship tuples during the authz implementation
- Hosted Postgres as durable system of record
- pgvector installed with Postgres for the initial vector/retrieval path
- ObjectStorage and artifact repository port with local development backing and future production object-store backing
- Core memory records that are explicit, scoped, auditable, and stored as canonical records before vector indexing
- Catalog and resolver concepts for file-defined apps, objects, actions, views, services, agents, skills, harnesses, conversations, evals, bindings, policies, executions, records, and traces

## Existing Local Platform Primitives
Current repo work already includes or is moving toward:
- Internal API-first platform keyed by `app_id`
- App registration and OAuth management in Neutrino admin console
- Local identity/session ports and adapters, with Ory/Kratos as the accepted authn/session target
- Local policy adapter, with OpenFGA as the accepted durable authz target
- Session-gated admin console and debug tooling
- Capability and OAuth client catalog gateway wrappers
- Independent app repo deploy ownership for frontend and backend

## First Vertical Milestone
The first implementation plan should prove:

`Workspace -> Project -> App manifest -> Object/Action -> Service -> Skill -> Binding -> Conversation runtime -> Execution record -> Trace -> Eval result`

The milestone should also prove service reuse: one app exposes an action that can use a reusable service package from the catalog when visibility and grants allow it.

Do not include generalized task/calendar item modeling from `docs/data-structure-ref/` in this milestone.
