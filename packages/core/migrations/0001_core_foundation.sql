CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS workspaces (
  workspace_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orgs (
  org_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, slug)
);

CREATE TABLE IF NOT EXISTS projects (
  project_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  org_id TEXT REFERENCES orgs(org_id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS actors (
  actor_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('user', 'app', 'service', 'system')),
  handle TEXT NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, handle)
);

CREATE TABLE IF NOT EXISTS groups (
  group_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, slug)
);

CREATE TABLE IF NOT EXISTS identities (
  identity_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  external_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('user', 'group')),
  maps_to_type TEXT NOT NULL CHECK (maps_to_type IN ('actor', 'group')),
  maps_to_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, provider, external_id)
);

CREATE TABLE IF NOT EXISTS grants (
  grant_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  grantee_type TEXT NOT NULL CHECK (grantee_type IN ('actor', 'group')),
  grantee_id TEXT NOT NULL,
  relation TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, grantee_type, grantee_id, relation, resource_type, resource_id)
);

CREATE TABLE IF NOT EXISTS app_packages (
  app_package_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  org_id TEXT REFERENCES orgs(org_id) ON DELETE SET NULL,
  package_name TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, package_name)
);

CREATE TABLE IF NOT EXISTS app_versions (
  app_version_id TEXT PRIMARY KEY,
  app_package_id TEXT NOT NULL REFERENCES app_packages(app_package_id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  manifest JSONB NOT NULL,
  lifecycle_state TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (app_package_id, version)
);

CREATE TABLE IF NOT EXISTS app_installations (
  app_installation_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(project_id) ON DELETE CASCADE,
  app_version_id TEXT NOT NULL REFERENCES app_versions(app_version_id) ON DELETE RESTRICT,
  installed_by_actor_id TEXT REFERENCES actors(actor_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS object_types (
  object_type_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  app_version_id TEXT NOT NULL REFERENCES app_versions(app_version_id) ON DELETE CASCADE,
  type_key TEXT NOT NULL,
  schema_ref TEXT NOT NULL,
  view_ref TEXT,
  visibility JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (app_version_id, type_key)
);

CREATE TABLE IF NOT EXISTS app_objects (
  object_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(project_id) ON DELETE CASCADE,
  object_type_id TEXT NOT NULL REFERENCES object_types(object_type_id) ON DELETE RESTRICT,
  state JSONB NOT NULL,
  visibility JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS action_definitions (
  action_definition_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  app_version_id TEXT NOT NULL REFERENCES app_versions(app_version_id) ON DELETE CASCADE,
  action_key TEXT NOT NULL,
  input_schema_ref TEXT,
  output_schema_ref TEXT,
  mutates JSONB NOT NULL DEFAULT '[]'::jsonb,
  handler_ref TEXT,
  service_ref TEXT,
  visibility JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (app_version_id, action_key)
);

CREATE TABLE IF NOT EXISTS service_packages (
  service_package_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  org_id TEXT REFERENCES orgs(org_id) ON DELETE SET NULL,
  package_name TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, package_name)
);

CREATE TABLE IF NOT EXISTS service_versions (
  service_version_id TEXT PRIMARY KEY,
  service_package_id TEXT NOT NULL REFERENCES service_packages(service_package_id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  manifest JSONB NOT NULL,
  lifecycle_state TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (service_package_id, version)
);

CREATE TABLE IF NOT EXISTS service_dependencies (
  service_dependency_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  dependent_service_version_id TEXT NOT NULL REFERENCES service_versions(service_version_id) ON DELETE CASCADE,
  dependency_ref TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (dependent_service_version_id, dependency_ref)
);

CREATE TABLE IF NOT EXISTS bindings (
  binding_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(project_id) ON DELETE CASCADE,
  environment TEXT NOT NULL,
  requirement TEXT NOT NULL,
  provider TEXT NOT NULL,
  service_ref TEXT,
  capability_id TEXT,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, project_id, environment, requirement)
);

CREATE TABLE IF NOT EXISTS binding_snapshots (
  binding_snapshot_id TEXT PRIMARY KEY,
  binding_id TEXT REFERENCES bindings(binding_id) ON DELETE SET NULL,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS executions (
  execution_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  org_id TEXT REFERENCES orgs(org_id) ON DELETE SET NULL,
  project_id TEXT REFERENCES projects(project_id) ON DELETE CASCADE,
  app_installation_id TEXT REFERENCES app_installations(app_installation_id) ON DELETE SET NULL,
  app_id TEXT NOT NULL,
  action_id TEXT,
  actor_id TEXT NOT NULL REFERENCES actors(actor_id) ON DELETE RESTRICT,
  service_ref TEXT NOT NULL,
  policy_snapshot_id TEXT,
  binding_snapshot_id TEXT REFERENCES binding_snapshots(binding_snapshot_id) ON DELETE SET NULL,
  schema_versions JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL,
  output TEXT,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS records (
  record_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(project_id) ON DELETE CASCADE,
  execution_id TEXT NOT NULL REFERENCES executions(execution_id) ON DELETE CASCADE,
  record_type TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  actor_id TEXT NOT NULL REFERENCES actors(actor_id) ON DELETE RESTRICT,
  service_ref TEXT NOT NULL,
  object_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  payload JSONB NOT NULL,
  visibility JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS traces (
  trace_id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL REFERENCES executions(execution_id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memory_records (
  memory_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(project_id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  content TEXT NOT NULL,
  source_execution_id TEXT REFERENCES executions(execution_id) ON DELETE SET NULL,
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS memory_records_embedding_idx
  ON memory_records USING ivfflat (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;

CREATE TABLE IF NOT EXISTS artifacts (
  artifact_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(project_id) ON DELETE CASCADE,
  object_uri TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  checksum TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_events (
  audit_event_id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(workspace_id) ON DELETE SET NULL,
  actor_id TEXT REFERENCES actors(actor_id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS usage_records (
  usage_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(project_id) ON DELETE CASCADE,
  execution_id TEXT REFERENCES executions(execution_id) ON DELETE SET NULL,
  provider TEXT,
  model TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_micros INTEGER,
  currency TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cost_records (
  cost_record_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  execution_id TEXT REFERENCES executions(execution_id) ON DELETE SET NULL,
  amount_micros INTEGER NOT NULL,
  currency TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
