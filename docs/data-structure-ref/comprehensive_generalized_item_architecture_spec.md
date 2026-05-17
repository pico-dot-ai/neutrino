# Generalized Item Architecture Specification

## Overview

This document defines a generalized, relation-driven data model intended to support productivity systems, knowledge management systems, project management systems, collaborative workspaces, orchestration systems, and graph-native information architectures.

The model emerged from an effort to unify traditionally separate concepts such as:

- Tasks / actions
- Events
- Checklist items
- List items
- Resources
- Notes
- Assets
- Projects
- Sublists and hierarchical structures
- Dependencies and blocking relationships

The resulting architecture intentionally minimizes rigid typing and instead derives semantics from:

- Field presence
- Relationships
- Context
- Ordering
- Metadata

The system is designed to:

- Scale to millions or billions of records
- Support enterprise multi-tenancy
- Enable arbitrary graph relationships
- Preserve composability
- Avoid schema fragmentation
- Enable multiple simultaneous interpretations of the same entity
- Support hierarchical and non-hierarchical structures equally well

The architecture follows a graph-oriented philosophy while remaining implementable in relational databases such as PostgreSQL.

---

# Design Philosophy

## Core Principle

Everything is an `Item`.

Rather than introducing separate tables or types for:

- Tasks
- Events
- Checklist items
- Notes
- Resources
- List containers
- Milestones

all entities are represented using a single generalized structure.

Relationships between items are expressed separately using `ItemRelation`.

This separation between:

- entity state (`Item`)
- structural context (`ItemRelation`)

creates a highly composable and extensible system.

---

# Architectural Goals

## 1. Eliminate Rigid Typing

The architecture intentionally avoids a required `kind` or `type` discriminator.

Instead:

- an item with `starts_at` and `ends_at` behaves like an event
- an item with `due_at` and assignees behaves like a task
- an item with a `url` behaves like a resource
- an item linked into an ordered container behaves like a list item
- an item containing other items behaves like a list or hierarchy node

This allows semantics to emerge dynamically.

---

## 2. Support Arbitrary Relationships

The system supports:

- hierarchical relationships
- dependency relationships
- references
- graph links
- ordered containment
- reusable items across multiple contexts

without requiring schema changes.

---

## 3. Separate Ordering from Identity

Ordering does not belong inside items themselves.

Instead:

- ordering exists within relationships
- an item may appear in multiple ordered contexts simultaneously
- each context may define different ordering

This enables:

- reusable items
- dynamic views
- drag-and-drop systems
- multiple simultaneous list representations

---

## 4. Multi-Tenant Scalability

The architecture is designed for:

- millions of users
- enterprise organizations
- large collaborative workspaces
- high-volume relational querying

while remaining query-efficient.

---

# Core Data Structures

# Item

The `Item` entity is the universal atomic unit.

```ts
Item {
  uuid: string

  // Core human-readable data
  title: string
  content: string (optional)
  url: string (optional)

  // Status and temporal fields
  status: enum(idle, active, in_progress, done, cancelled, archived)
  priority: enum(low, medium, high, critical)
  starts_at: datetime (optional)
  ends_at: datetime (optional)
  due_at: datetime (optional)

  // Relationships and semantics
  related_uuids: string[]
  tags: string[]

  // People and ownership
  assignee_uuids: string[] (optional)
  participant_uuids: string[] (optional)
  owner_uuid: string

  // Lifecycle and tracking
  created_by: string
  created_at: datetime
  updated_at: datetime
  deleted_at: datetime (nullable)
}
```

---

# ItemRelation

`ItemRelation` represents typed relationships between items.

```ts
ItemRelation {
  from_uuid: string
  to_uuid: string
  order_index: number (optional)
  relation_type: string
}
```

---

# ItemRelation Philosophy

`ItemRelation` is responsible for:

- containment
- ordering
- dependency graphs
- semantic references
- hierarchy
- contextual reuse

The same item may participate in many simultaneous relationships.

Examples:

- contained in a checklist
- referenced by a project
- blocked by another task
- part of a milestone
- included in a dashboard

all simultaneously.

---

# Relation Types

The system intentionally keeps `relation_type` open-ended.

Common examples:

| relation_type | Meaning |
|---|---|
| contains | Parent contains child |
| references | Item references another item |
| blocks | Source blocks destination |
| depends_on | Source depends on destination |
| duplicates | Items are duplicates |
| precedes | Sequential ordering |
| related | Generic semantic relationship |
| assigned_to | Optional explicit assignment graph |

The architecture does not require a fixed ontology.

---

# Semantic Interpretation

Semantics emerge from field combinations.

| Field Combination | Interpreted As |
|---|---|
| starts_at + ends_at | Event |
| due_at + assignee_uuids | Task |
| url only | Resource |
| contains relationships | List or hierarchy |
| order_index present | Ordered list membership |
| references relationships | Linked resource |
| blocks relationships | Dependency graph |

This avoids over-modeling while preserving rich behavior.

---

# Hierarchical Structures

The architecture fully supports:

- nested lists
- sublists
- checklist items
- task trees
- arbitrarily deep hierarchies

Example:

```json
[
  {
    "from_uuid": "launch-plan",
    "to_uuid": "content-section",
    "relation_type": "contains",
    "order_index": 0
  },
  {
    "from_uuid": "content-section",
    "to_uuid": "write-copy-task",
    "relation_type": "contains",
    "order_index": 0
  }
]
```

No dedicated hierarchy field is required.

Hierarchy emerges from recursive containment relationships.

---

# Ordered Lists

Ordered lists are created by:

1. creating an item that acts as a container
2. linking child items using `ItemRelation`
3. defining `order_index`

Example:

```json
[
  {
    "from_uuid": "shopping-list",
    "to_uuid": "eggs",
    "relation_type": "contains",
    "order_index": 0
  },
  {
    "from_uuid": "shopping-list",
    "to_uuid": "bacon",
    "relation_type": "contains",
    "order_index": 1
  }
]
```

The same item may appear in multiple lists simultaneously.

---

# Dependency Graphs

The model supports advanced project management relationships.

Example:

```json
[
  {
    "from_uuid": "finalize-copy",
    "to_uuid": "run-qa",
    "relation_type": "blocks"
  },
  {
    "from_uuid": "run-qa",
    "to_uuid": "launch-site",
    "relation_type": "depends_on"
  }
]
```

This enables:

- DAG workflows
- blockers
- dependencies
- sequencing
- milestone management

without additional task tables.

---

# Reusable Items Across Contexts

Items are not owned by a single list or hierarchy.

An item may appear in:

- multiple lists
- multiple projects
- multiple dashboards
- multiple filtered views

simultaneously.

This is a major architectural advantage over parent-owned models.

---

# Multi-Tenant Architecture

To support enterprise-scale systems, all queries should be tenant-scoped.

Recommended field:

```ts
organization_id: UUID
```

This field should exist on:

- Item
- ItemRelation
- auxiliary metadata tables

---

# SQL Scaling Strategy

## Tenant Scoping

All queries should filter by organization.

Example:

```sql
SELECT * FROM Item
WHERE organization_id = :org_id
ORDER BY created_at DESC
LIMIT 50;
```

---

## Composite Indexing

Recommended indexes:

```sql
CREATE INDEX idx_item_org_created
ON Item (organization_id, created_at DESC);
```

Additional recommended indexes:

```sql
CREATE INDEX idx_relation_from
ON ItemRelation (organization_id, from_uuid);

CREATE INDEX idx_relation_to
ON ItemRelation (organization_id, to_uuid);
```

---

## Keyset Pagination

Avoid offset pagination at scale.

Use cursor-based pagination:

```sql
SELECT * FROM Item
WHERE organization_id = :org_id
AND created_at < :cursor
ORDER BY created_at DESC
LIMIT 50;
```

---

## Row-Level Security

Optional PostgreSQL Row-Level Security:

```sql
ALTER TABLE Item ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_isolation
  ON Item
  USING (organization_id = current_setting('app.current_org')::uuid);
```

This guarantees tenant isolation.

---

# Why This Architecture Is Powerful

## Unified Model

One entity system replaces:

- tasks
- checklist items
- notes
- events
- resources
- lists
- containers
- subtasks
- dependencies

This dramatically simplifies both:

- storage
- APIs
- synchronization
- permissions
- indexing
- caching

---

## Graph-Native

The system naturally behaves as a graph.

This makes it highly compatible with:

- knowledge systems
- RAG systems
- AI orchestration
- semantic search
- recommendation systems
- workflow engines

---

## Composable UI

Views become projections over relationships.

Examples:

| UI | Derived From |
|---|---|
| Checklist | contains + order_index |
| Kanban board | status |
| Calendar | starts_at / ends_at |
| Timeline | due_at |
| Graph view | ItemRelation network |
| Resource library | url presence |
| Dependency graph | blocks / depends_on |

The storage model remains unchanged.

---

## Extensible

The architecture can evolve without schema fragmentation.

Future additions may include:

- AI embeddings
- access control metadata
- audit logs
- workflow automation
- computed fields
- notifications
- semantic vectors
- graph ranking
- search indexes

without changing the core abstractions.

---

# Recommended Future Extensions

## ItemMetadata

Optional extensible metadata table:

```ts
ItemMetadata {
  item_uuid: string
  key: string
  value: json
}
```

Useful for:

- custom fields
- workspace-specific extensions
- plugin systems
- AI annotations

---

## Access Control

Optional permissions model:

```ts
Permission {
  item_uuid: string
  principal_uuid: string
  access_level: string
}
```

---

## Activity Logs

```ts
ItemActivity {
  item_uuid: string
  actor_uuid: string
  action: string
  created_at: datetime
}
```

---

# Summary

This architecture creates:

- a unified item system
- graph-native semantics
- composable relationships
- scalable enterprise support
- reusable entities
- hierarchical and non-hierarchical structures
- dependency graphs
- dynamic interpretation

while remaining:

- elegant
- minimal
- extensible
- relationally implementable
- operationally scalable

The system intentionally avoids rigid ontology in favor of emergent semantics derived from relationships and context.

This enables extremely flexible product surfaces while preserving a clean and durable core model.

