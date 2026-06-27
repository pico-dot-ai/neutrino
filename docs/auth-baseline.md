# Auth Baseline

## Purpose
This document records the accepted authentication and authorization direction for Neutrino before the implementation plans are built.

Authoritative architecture constraints remain in [architecture/contract.json](/Users/kevinrochowski/Documents/Developer/repos/pico/neutrino/architecture/contract.json). This document is the human-readable planning baseline for auth-specific implementation slices.

## Accepted Direction
- Authentication and session management will move to Ory/Kratos first.
- Local username/password remains a development, bootstrap, and emergency fallback only until the Ory/Kratos path is implemented.
- Hosted auth must enforce signup eligibility and verified-email requirements before product access when those controls are configured.
- OpenFGA is the durable runtime authorization model behind `PolicyEngine`.
- Ory Keto/Permissions is a related Zanzibar-style option, but it is not the selected runtime authorization engine.
- Authn and authz will be implemented as separate steps so login/session failures and permission-decision failures are isolated during rollout.
- Tenant user lifecycle, default grants, and audit/readback live in Neutrino actor, identity, grant, and audit records rather than Kratos traits, metadata, or public admin surfaces.

## OpenFGA Model Baseline
The initial OpenFGA model should represent Neutrino platform concepts directly:

| Neutrino concept | OpenFGA mapping | Notes |
| --- | --- | --- |
| Actor | `user:<actorId>` subject | Actor IDs must be durable Neutrino principals mapped from Ory/Kratos identities or service credentials. |
| Group | `group` type with `member` relation | Group membership is represented as relationships, not hardcoded roles. |
| Workspace | `workspace` object type | Top-level collaboration and security boundary. |
| Project | `project` object type with parent workspace relationship | Project permissions may inherit from workspace permissions. |
| App | `app` object type with parent project relationship | Apps expose objects, actions, views, and visibility. |
| Action | `action` object type with parent app relationship | `can_invoke` should resolve through explicit grants and app-level use where intended. |
| Service | `service` object type | `can_use` governs reusable service access across apps. |
| Artifact and memory | `artifact` and `memory` object types | `can_read` governs retrieval; vector rows must inherit source visibility. |
| Grant records | OpenFGA relationship tuples | Neutrino grants remain source inputs, audit metadata, and local/bootstrap records that sync into OpenFGA. |

Initial permission names:

- `can_manage`: control-plane and resource administration.
- `can_use`: app or service usage.
- `can_invoke`: action invocation.
- `can_read`: artifact, memory, and record retrieval.

## Deferred Builder
No permission builder will be built in the current auth decision-recording slice.

If added later, builder forms must project to OpenFGA authorization models and relationship tuples. They must remain inspectable and must not introduce a separate permission language or hidden app-specific authz structure.

## Implementation Order
1. Migrate authentication and sessions to Ory/Kratos.
2. Design and implement OpenFGA model, tuple sync, and `PolicyEngine` adapter.
3. Add authz decision snapshots to runtime records where executions depend on OpenFGA checks.
4. Consider builder UX only after the OpenFGA model and runtime checks are validated.
