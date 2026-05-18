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
- Services are reusable platform units.
- Apps are user-facing surfaces and control planes over services.
- Builder UIs must operate on the same file-defined resources that can be edited directly.
- Service semantics come before physical service extraction.
- Tenant safety, auth, storage, artifacts, memory, observability, and policy are platform core concerns.

## First-Run Platform Core
The first serious implementation plan should include:
- Hosted auth surface at `auth.pico.ai`
- Real login page, not HTTP Basic Auth
- Local username/password adapter for development and early internal use
- Migration path to Ory Kratos
- SSO path through identity, authenticator, directory, and policy ports
- Hosted Postgres as durable system of record
- pgvector installed with Postgres for the initial vector/retrieval path
- ObjectStorage and artifact repository port with local development backing and future production object-store backing
- Core memory records that are explicit, scoped, auditable, and stored as canonical records before vector indexing
- Catalog and resolver concepts for file-defined apps, services, agents, skills, harnesses, conversations, evals, bindings, policies, runs, and traces

## Existing Local Platform Primitives
Current repo work already includes or is moving toward:
- Internal API-first platform keyed by `app_id`
- App registration and OAuth management in Neutrino admin console
- Local identity/session ports and adapters
- Session-gated admin console and debug tooling
- Capability and OAuth client catalog gateway wrappers
- Independent app repo deploy ownership for frontend and backend

## First Vertical Milestone
The first implementation plan should prove:

`Tenant -> Project -> App manifest -> Agent service -> Skill -> Harness service -> LLM binding -> Conversation runtime -> Run record -> Trace -> Eval result`

The milestone should also prove service donation: one app exposes a reusable service or capability that another app or agent consumes through the catalog.

Do not include generalized task/calendar item modeling from `docs/data-structure-ref/` in this milestone.
