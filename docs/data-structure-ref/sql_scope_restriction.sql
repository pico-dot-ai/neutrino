-- SQL Techniques for Restricting Scope in Multi-Tenant Environments

-- Item table with organization scoping
CREATE TABLE Item (
  uuid UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  url TEXT,
  status TEXT CHECK (status IN ('idle', 'active', 'in_progress', 'done', 'cancelled', 'archived')),
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  starts_at TIMESTAMP,
  ends_at TIMESTAMP,
  due_at TIMESTAMP,
  assignee_uuids UUID[],
  participant_uuids UUID[],
  owner_uuid UUID,
  created_by UUID,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  deleted_at TIMESTAMP
);

-- Index for fast filtering by org and time
CREATE INDEX idx_item_org_created ON Item (organization_id, created_at DESC);

-- Query with organization scope and pagination
-- Example: Fetch the latest 50 items for an organization
SELECT * FROM Item
WHERE organization_id = :org_id
ORDER BY created_at DESC
LIMIT 50;

-- Optional: Keyset pagination for scalable navigation
SELECT * FROM Item
WHERE organization_id = :org_id AND created_at < :cursor
ORDER BY created_at DESC
LIMIT 50;

-- Optional: Row-Level Security (RLS)
ALTER TABLE Item ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_isolation
  ON Item
  USING (organization_id = current_setting('app.current_org')::uuid);
