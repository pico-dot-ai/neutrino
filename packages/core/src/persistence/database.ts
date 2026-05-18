import { Kysely, PostgresDialect, type ColumnType, type JSONColumnType } from "kysely";
import { Pool, type PoolConfig } from "pg";

export type TimestampColumn = ColumnType<Date, Date | string | undefined, Date | string>;

export type CoreDatabase = {
  tenants: {
    tenant_id: string;
    name: string;
    created_at: TimestampColumn;
    updated_at: TimestampColumn;
  };
  projects: {
    project_id: string;
    tenant_id: string;
    name: string;
    created_at: TimestampColumn;
    updated_at: TimestampColumn;
  };
  users: {
    user_id: string;
    tenant_id: string | null;
    username: string;
    email: string;
    password_hash: string | null;
    roles: JSONColumnType<string[]>;
    created_at: TimestampColumn;
    updated_at: TimestampColumn;
  };
  services: {
    service_id: string;
    tenant_id: string | null;
    manifest: JSONColumnType<Record<string, unknown>>;
    lifecycle_state: string;
    created_at: TimestampColumn;
    updated_at: TimestampColumn;
  };
  bindings: {
    binding_id: string;
    tenant_id: string;
    project_id: string | null;
    environment: string;
    requirement: string;
    provider: string;
    service_id: string | null;
    capability_id: string | null;
    model: string | null;
    created_at: TimestampColumn;
    updated_at: TimestampColumn;
  };
  agents: {
    agent_id: string;
    tenant_id: string;
    project_id: string | null;
    manifest: JSONColumnType<Record<string, unknown>>;
    created_at: TimestampColumn;
    updated_at: TimestampColumn;
  };
  skills: {
    skill_id: string;
    tenant_id: string | null;
    manifest: JSONColumnType<Record<string, unknown>>;
    created_at: TimestampColumn;
    updated_at: TimestampColumn;
  };
  harnesses: {
    harness_id: string;
    tenant_id: string | null;
    manifest: JSONColumnType<Record<string, unknown>>;
    created_at: TimestampColumn;
    updated_at: TimestampColumn;
  };
  conversations: {
    conversation_id: string;
    tenant_id: string;
    project_id: string | null;
    manifest: JSONColumnType<Record<string, unknown>>;
    created_at: TimestampColumn;
    updated_at: TimestampColumn;
  };
  evals: {
    eval_id: string;
    tenant_id: string | null;
    manifest: JSONColumnType<Record<string, unknown>>;
    created_at: TimestampColumn;
    updated_at: TimestampColumn;
  };
  runs: {
    run_id: string;
    tenant_id: string;
    project_id: string | null;
    app_id: string;
    agent_id: string;
    harness_id: string;
    conversation_id: string;
    status: string;
    output: string | null;
    error: string | null;
    started_at: TimestampColumn;
    completed_at: TimestampColumn | null;
  };
  traces: {
    trace_id: string;
    run_id: string;
    event_type: string;
    message: string;
    metadata: JSONColumnType<Record<string, unknown> | null>;
    created_at: TimestampColumn;
  };
  memory_records: {
    memory_id: string;
    tenant_id: string;
    project_id: string | null;
    kind: string;
    content: string;
    source_run_id: string | null;
    embedding: unknown | null;
    created_at: TimestampColumn;
  };
  artifacts: {
    artifact_id: string;
    tenant_id: string;
    project_id: string | null;
    object_uri: string;
    content_type: string;
    size_bytes: number;
    checksum: string | null;
    created_at: TimestampColumn;
  };
  audit_events: {
    audit_event_id: string;
    tenant_id: string | null;
    actor_subject: string | null;
    action: string;
    resource: string;
    metadata: JSONColumnType<Record<string, unknown> | null>;
    created_at: TimestampColumn;
  };
  usage_records: {
    usage_id: string;
    tenant_id: string;
    project_id: string | null;
    run_id: string | null;
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
    tenant_id: string;
    run_id: string | null;
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
