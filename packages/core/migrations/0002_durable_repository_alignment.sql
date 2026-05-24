CREATE TABLE IF NOT EXISTS manifest_records (
  manifest_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  org_id TEXT,
  group_id TEXT,
  project_id TEXT,
  app_installation_id TEXT,
  resource_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  version INTEGER NOT NULL,
  lifecycle_state TEXT NOT NULL DEFAULT 'active',
  manifest JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS manifest_records_lookup_idx
  ON manifest_records (workspace_id, kind, resource_id, version);

ALTER TABLE executions
  ADD COLUMN IF NOT EXISTS agent_id TEXT,
  ADD COLUMN IF NOT EXISTS harness_id TEXT,
  ADD COLUMN IF NOT EXISTS conversation_id TEXT;
