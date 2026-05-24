# Neutrino Product Model Placeholder

## Purpose
This is a placeholder decision-capture document for the product and schema model Neutrino is trying to achieve.

It is not implementation truth yet. It should guide future updates to `architecture/contract.json`, `docs/requirements-baseline.md`, schemas, migrations, SDKs, and developer documentation when those changes are deliberately planned.

The goal is a platform that is very developer-friendly and simple at the surface, while preserving enough structure underneath to avoid bad data, schema, lifecycle, and authorization choices.

## Core Principle
Neutrino should be simple for developers and powerful underneath.

Avoid the Salesforce-style failure mode:
- too many exposed platform nouns
- too much admin/configuration ceremony
- object-model sprawl
- platform-specific language before developers can ship useful apps

The developer-facing surface should stay small.

```text
App
Object
Action
View
Handler
Visibility
```

The internal platform can be richer.

```text
Workspace
Org
Project
App
Object Type
Object
Action
Service
Binding
Policy
Execution
Record
Artifact
Actor
Group
Identity
Grant
```

## Workspace, Org, And Project
Use `Workspace` in product and developer-facing language.

```text
Workspace = customer-visible account, collaboration, and data boundary
Tenant = deprecated implementation vocabulary; use Workspace in product and schema naming
Org = publisher/admin boundary inside a workspace
Project = scoped place where apps run against data
```

For small customers, the default shape can be:

```text
Workspace: SmallCo
  Org: SmallCo
    Project: Default
```

Developers should mostly see:

```text
Workspace
Project
App
```

Publisher/org language appears when publishing apps or reusable services externally.

## Actors, Groups, Identity, And Grants
Organizations need a flexible but simple way to model their people and structure, especially for auth.

The first schema should be inspired by Unix groups and relationship tuples, not enterprise IAM products.

```text
actor
group
identity
grant
```

Definitions:

```text
actor    anything that can act: user, app, service, or system
group    named collection of actors or other groups, used like Unix groups
identity login/SSO/directory identity mapped to an actor or group
grant    relationship between an actor/group and a resource
```

Use product-friendly labels in UI:

```text
Member = actor with kind user
Team = group shown as an organization/team structure
Service account = actor with kind service
App actor = actor with kind app
```

Do not make `member`, `team`, `role`, `permission_set`, or `team_member` separate first-cut schema primitives. They can be UI labels, grant conventions, or later conveniences.

Core behavior:

```text
Actors belong to groups through grants.
Groups can represent teams, departments, customer cohorts, contractors, or app-specific roles.
Access is granted through grants, preferably to groups rather than individual users.
SSO maps external users/groups into actors/groups through identities.
Visibility controls who can discover/install/use a resource.
Policy controls runtime authorization and data access.
```

Example tuples:

```text
actor:alice member_of group:support
group:support can_use app:@acme/support-desk
group:support can_invoke action:@acme/support-desk/classify_ticket
actor:app_support_desk can_invoke service:@acme/ticket-triage@1.0.0
group:customer_globex can_install app:@acme/support-desk
```

Recommended hierarchy:

```text
Workspace
  Org
    Group
      Actor
    Project
```

Minimal auth schema:

```text
actor
group
identity
grant
```

Suggested fields:

```text
actor
  id
  workspace_id
  kind: user | app | service | system
  handle
  display_name
  email?

group
  id
  workspace_id
  slug
  display_name

identity
  id
  workspace_id
  provider
  external_id
  kind: user | group
  maps_to_type: actor | group
  maps_to_id

grant
  id
  workspace_id
  grantee_type: actor | group
  grantee_id
  relation
  resource_type
  resource_id
```

Examples:

```text
identity local alice@acme.com user -> actor:alice
identity okta 00u123 user -> actor:alice
identity okta 00g456 group -> group:support

grant actor:alice member_of group:support
grant group:support can_use app:@acme/support-desk
grant group:support can_invoke action:@acme/support-desk/classify_ticket
```

Rules:
- Prefer grants to groups over grants to individual user actors.
- Allow an actor to belong to multiple groups.
- Model team membership as a `member_of` grant, not a separate table.
- Model roles as conventional groups or grant relations first, not a separate role schema.
- Map SSO users and SSO groups through `identity`.
- Keep nested groups optional and shallow at first; deep hierarchy creates debugging pain.
- Make effective access explainable: an actor should be able to see why they can access a thing.
- Do not expose the full policy engine as the first developer interface.
- Visibility remains the developer-facing exposure control; policy and grants enforce runtime access.

## Apps
An app is the product surface a developer publishes or installs.

Apps can expose:
- objects
- actions
- views
- visibility rules
- handlers

Apps can be private, internal, public, or limited to specific customers.

Example:

```yaml
app: "@acme/support-desk"
version: "1.0.0"

visibility:
  access: customers
  customers:
    - globex
    - initech
```

## Objects
Objects are small typed representations of things an app exposes.

Examples:
- ticket
- document
- customer
- pull_request
- review_finding
- summary

Objects are current, queryable state. They are not the audit log.

Example:

```yaml
objects:
  ticket:
    schema: ./schemas/ticket.json
    view: ./views/ticket-card.tsx
    visibility:
      access: inherited
```

## Views
Views are app-defined presentation bindings for objects or action results.

Views are optional. Typed data comes first; UI is a projection.

Example:

```yaml
views:
  ticket_card:
    resource: ui://support/ticket-card
```

For MCP Apps, a view can map to a UI resource. Without MCP Apps support, the object must still be usable as typed data.

## Actions
Actions are callable API/tool surfaces exposed by an app.

Examples:
- classify_ticket
- draft_reply
- close_ticket
- summarize_document
- review_pr

Actions can read or mutate objects. They have input/output schemas and handlers.

Example:

```yaml
actions:
  classify_ticket:
    input: ./schemas/classify-ticket.input.json
    output: ./schemas/classification.output.json
    mutates:
      - ticket
    handler: ./actions/classify-ticket.ts
    visibility:
      access: inherited
```

Actions map naturally to MCP tools or HTTP/API endpoints.

## Handlers
Handlers are the developer-friendly implementation entrypoint.

Developers should start by writing handlers, not by configuring services.

```yaml
actions:
  classify_ticket:
    handler: ./actions/classify-ticket.ts
```

Neutrino can internally treat a handler as an app-private service.

If it becomes reusable:

```yaml
actions:
  classify_ticket:
    uses: "@acme/ticket-triage@1.0.0"
```

## Services
Services are reusable governed implementation units behind actions.

Developer-facing framing:

```text
Start with handlers.
Promote to services when reuse, versioning, governance, sharing, or independent lifecycle is needed.
```

Service identity:

```text
@scope/service-name@version
```

Rules:

```text
@pico/* = first-party platform services
@acme/* = workspace/org-owned services
app-private services = explicitly private/project-scoped
```

Services are not Docker or OCI packaging specs. Container image, entrypoint, port, compose, healthcheck, and sidecar details are deferred implementation concerns behind service bindings or runtimes.

## Action Vs Service
Keep actions and services separate.

```text
Action = what this app exposes
Service = reusable governed implementation behind one or more actions
Handler = simple code entrypoint for an action
```

Relationships:

```text
One action can call multiple services.
Multiple actions can call one service.
One service can be reused across apps.
Some services are headless/internal only.
```

## Visibility
Use `Visibility`, not `Audience`.

Visibility answers:

```text
Who can see/install/use this app, object, action, or view?
```

Initial visibility values:

```text
private
internal
customers
public
inherited
```

Meanings:

```text
private   only publisher/developer
internal  publisher workspace/org only
customers selected customer workspaces/orgs
public    broadly available, still subject to platform policy
inherited use parent visibility
```

Visibility can exist at multiple levels:

```text
app visibility
object visibility
action visibility
view visibility
```

Default behavior:

```text
objects/actions/views inherit app visibility unless overridden
```

Important distinction:

```text
Visibility = availability / exposure
Policy = runtime authorization and data access
```

## Publishing And Grants
An org/workspace can publish apps and decide where they are exposed.

Apps can be exposed to:
- only publisher
- internal workspace/org
- specific customer workspaces/orgs
- public

Internally this likely becomes grants:

```text
grant
  grantee_type: actor | group
  grantee_id
  relation: discover | install | use | read | write | invoke | render | admin
  resource_type: app | object | action | view | service
  resource_id
```

Customer-specific or public exposure should still use groups rather than special-case schemas. For example, `group:customer_globex can_install app:@acme/support-desk` or `group:public can_discover app:@acme/public-docs`.

Developers should mostly see `visibility`, not raw grants.

## Service Lifecycle
Published/shared services must not disappear just because the originating app changes or is removed.

Rules:

```text
Published versions are immutable.
Exact version identifiers cannot be reused for different behavior.
Dependents must not break silently.
Deprecation is the normal exit path.
Deletion/unpublish is exceptional and blocked if dependents exist.
App deletion does not delete shared services with active dependents.
App-private services can be deleted with the app.
```

This follows an npm-style package philosophy.

## MCP And MCP Apps
Support MCP and MCP Apps as projection layers, not as Neutrino's internal source of truth.

Mapping:

```text
App action -> MCP tool
App object -> MCP resource
App view -> MCP Apps UI resource
Action call -> policy-checked execution
Execution output -> tool result
Object mutation -> records + updated object state
```

Rule:

```text
Objects expose typed data first.
Views provide optional app-defined UI.
```

## Execution And Records
Hard invariants:

```text
No execution without actor.
No record without scope.
No retrieval without policy.
No service without version.
No binding without snapshot.
No output without schema.
```

Definitions:

```text
Execution = one governed run
Record = immutable historical fact emitted during execution
Object = current state
```

Do not collapse object state and record history.

## Minimal Durable Schema
Initial internal schema should include:

```text
workspace
org
project
actor
group
identity
grant

app_package
app_version
app_installation

object_type
app_object

action_definition

service_package
service_version
service_dependency

binding
binding_snapshot

execution
record
artifact
```

This is enough to avoid bad schema choices without building a giant platform up front.

## Deferred
Explicitly defer:

```text
recipes/templates as first-class product artifacts
marketplace
workflow engine
complex semver ranges
pricing/ratings
multi-region tenancy
full policy DSL
custom object inheritance
containerized service packaging
Salesforce-style admin object builders
```

Recipes/templates can exist later as scaffolding conveniences, but they are not core product artifacts.

## Developer Promise
The developer should experience Neutrino like this:

```text
Define an app.
Define objects.
Define actions.
Write handlers.
Set visibility.
Neutrino handles policy, execution, records, reuse, MCP, and UI projection.
```

Example first manifest:

```yaml
app: "@acme/support-desk"
version: "1.0.0"

visibility:
  access: customers
  customers:
    - globex
    - initech

objects:
  ticket:
    schema: ./schemas/ticket.json
    view: ./views/ticket-card.tsx
    visibility:
      access: inherited

actions:
  classify_ticket:
    input: ./schemas/classify-ticket.input.json
    output: ./schemas/classification.output.json
    mutates:
      - ticket
    handler: ./actions/classify-ticket.ts
    visibility:
      access: inherited

  export_all_tickets:
    handler: ./actions/export-all.ts
    visibility:
      access: internal
```
