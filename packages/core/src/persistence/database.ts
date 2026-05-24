import { Kysely, PostgresDialect, type ColumnType, type JSONColumnType } from "kysely";
import { Pool, type PoolConfig } from "pg";

export type TimestampColumn = ColumnType<Date, Date | string | undefined, Date | string>;

export type CoreDatabase = {
  workspaces: {
    workspace_id: string;
    name: string;
    created_at: TimestampColumn;
    updated_at: TimestampColumn;
  };
  orgs: {
    org_id: string;
    workspace_id: string;
    name: string;
    slug: string;
    created_at: TimestampColumn;
    updated_at: TimestampColumn;
  };
  projects: {
    project_id: string;
    workspace_id: string;
    org_id: string | null;
    name: string;
    created_at: TimestampColumn;
    updated_at: TimestampColumn;
  };
  actors: {
    actor_id: string;
    workspace_id: string;
    kind: string;
    handle: string;
    display_name: string;
    email: string | null;
    created_at: TimestampColumn;
    updated_at: TimestampColumn;
  };
  groups: {
    group_id: string;
    workspace_id: string;
    slug: string;
    display_name: string;
    created_at: TimestampColumn;
    updated_at: TimestampColumn;
  };
  identities: {
    identity_id: string;
    workspace_id: string;
    provider: string;
    external_id: string;
    kind: string;
    maps_to_type: string;
    maps_to_id: string;
    created_at: TimestampColumn;
    updated_at: TimestampColumn;
  };
  grants: {
    grant_id: string;
    workspace_id: string;
    grantee_type: string;
    grantee_id: string;
    relation: string;
    resource_type: string;
    resource_id: string;
    created_at: TimestampColumn;
  };
  app_packages: {
    app_package_id: string;
    workspace_id: string;
    org_id: string | null;
    package_name: string;
    display_name: string | null;
    created_at: TimestampColumn;
    updated_at: TimestampColumn;
  };
  app_versions: {
    app_version_id: string;
    app_package_id: string;
    version: number;
    manifest: JSONColumnType<Record<string, unknown>>;
    lifecycle_state: string;
    created_at: TimestampColumn;
    updated_at: TimestampColumn;
  };
  app_installations: {
    app_installation_id: string;
    workspace_id: string;
    project_id: string | null;
    app_version_id: string;
    installed_by_actor_id: string | null;
    created_at: TimestampColumn;
    updated_at: TimestampColumn;
  };
  object_types: {
    object_type_id: string;
    workspace_id: string;
    app_version_id: string;
    type_key: string;
    schema_ref: string;
    view_ref: string | null;
    visibility: JSONColumnType<Record<string, unknown> | null>;
    created_at: TimestampColumn;
    updated_at: TimestampColumn;
  };
  app_objects: {
    object_id: string;
    workspace_id: string;
    project_id: string | null;
    object_type_id: string;
    state: JSONColumnType<Record<string, unknown>>;
    visibility: JSONColumnType<Record<string, unknown> | null>;
    created_at: TimestampColumn;
    updated_at: TimestampColumn;
  };
  action_definitions: {
    action_definition_id: string;
    workspace_id: string;
    app_version_id: string;
    action_key: string;
    input_schema_ref: string | null;
    output_schema_ref: string | null;
    mutates: JSONColumnType<string[]>;
    handler_ref: string | null;
    service_ref: string | null;
    visibility: JSONColumnType<Record<string, unknown> | null>;
    created_at: TimestampColumn;
    updated_at: TimestampColumn;
  };
  service_packages: {
    service_package_id: string;
    workspace_id: string;
    org_id: string | null;
    package_name: string;
    display_name: string | null;
    created_at: TimestampColumn;
    updated_at: TimestampColumn;
  };
  service_versions: {
    service_version_id: string;
    service_package_id: string;
    version: number;
    manifest: JSONColumnType<Record<string, unknown>>;
    lifecycle_state: string;
    created_at: TimestampColumn;
    updated_at: TimestampColumn;
  };
  service_dependencies: {
    service_dependency_id: string;
    workspace_id: string;
    dependent_service_version_id: string;
    dependency_ref: string;
    created_at: TimestampColumn;
  };
  bindings: {
    binding_id: string;
    workspace_id: string;
    project_id: string | null;
    environment: string;
    requirement: string;
    provider: string | null;
    service_ref: string | null;
    capability_id: string | null;
    model: string | null;
    created_at: TimestampColumn;
    updated_at: TimestampColumn;
  };
  binding_snapshots: {
    binding_snapshot_id: string;
    binding_id: string | null;
    workspace_id: string;
    snapshot: JSONColumnType<Record<string, unknown>>;
    created_at: TimestampColumn;
  };
  executions: {
    execution_id: string;
    workspace_id: string;
    org_id: string | null;
    project_id: string | null;
    app_installation_id: string | null;
    app_id: string;
    action_id: string | null;
    actor_id: string;
    service_ref: string;
    policy_snapshot_id: string | null;
    binding_snapshot_id: string | null;
    schema_versions: JSONColumnType<Record<string, string>>;
    status: string;
    output: string | null;
    error: string | null;
    started_at: TimestampColumn;
    completed_at: TimestampColumn | null;
  };
  records: {
    record_id: string;
    workspace_id: string;
    project_id: string | null;
    execution_id: string;
    record_type: string;
    schema_version: string;
    actor_id: string;
    service_ref: string;
    object_refs: JSONColumnType<string[]>;
    payload: JSONColumnType<Record<string, unknown>>;
    visibility: JSONColumnType<Record<string, unknown> | null>;
    created_at: TimestampColumn;
  };
  traces: {
    trace_id: string;
    execution_id: string;
    event_type: string;
    message: string;
    metadata: JSONColumnType<Record<string, unknown> | null>;
    created_at: TimestampColumn;
  };
  memory_records: {
    memory_id: string;
    workspace_id: string;
    project_id: string | null;
    kind: string;
    content: string;
    source_execution_id: string | null;
    embedding: unknown | null;
    created_at: TimestampColumn;
  };
  artifacts: {
    artifact_id: string;
    workspace_id: string;
    project_id: string | null;
    object_uri: string;
    content_type: string;
    size_bytes: number;
    checksum: string | null;
    created_at: TimestampColumn;
  };
  audit_events: {
    audit_event_id: string;
    workspace_id: string | null;
    actor_id: string | null;
    action: string;
    resource: string;
    metadata: JSONColumnType<Record<string, unknown> | null>;
    created_at: TimestampColumn;
  };
  usage_records: {
    usage_id: string;
    workspace_id: string;
    project_id: string | null;
    execution_id: string | null;
    provider: string | null;
    model: string | null;
    input_tokens: number | null;
    output_tokens: number | null;
    cost_micros: number | null;
    currency: string | null;
    created_at: TimestampColumn;
  };
  cost_records: {
    cost_record_id: string;
    workspace_id: string;
    execution_id: string | null;
    amount_micros: number;
    currency: string;
    source: string;
    created_at: TimestampColumn;
  };
};

export function createPostgresCoreDatabase(config: PoolConfig | string) {
  const pool = new Pool(typeof config === "string" ? { connectionString: config } : config);

  return new Kysely<CoreDatabase>({
    dialect: new PostgresDialect({
      pool
    })
  });
}
