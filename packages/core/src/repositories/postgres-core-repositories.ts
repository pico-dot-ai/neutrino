import { createHash } from "node:crypto";
import { Pool, type PoolConfig } from "pg";
import type {
  AccessGraphRepository,
  ArtifactRepository,
  BindingResolver,
  GrantListFilter,
  ManifestRegistry,
  MemoryRepository,
  ResolvedBinding,
  RunRepository,
  ServiceCatalog,
  TraceRepository,
  UsageLedger
} from "@neutrino/ports";
import type {
  ActorKind,
  ActorRecord,
  ArtifactRecord,
  BindingRecord,
  GrantRecord,
  GroupRecord,
  IdentityKind,
  IdentityRecord,
  ManifestLifecycleState,
  ManifestRecord,
  MemoryRecord,
  PlatformManifest,
  PicoAppManifest,
  PicoBindingManifest,
  PicoServiceManifest,
  RunRecord,
  ScopeRef,
  ServiceRecord,
  TraceRecord,
  UsageRecord
} from "@neutrino/schema";
import { createInMemoryCoreRepositories } from "./in-memory-core-repositories";

const DEFAULT_WORKSPACE_ID = "workspace_picoai";
const DEFAULT_ACTOR_ID = "actor_system";
const DEFAULT_SERVICE_REF = "@pico/dev-agent-service@1";

type PoolLike = Pick<Pool, "query" | "end">;

type PostgresRepositoryOptions = {
  connectionString?: string | null;
  pool?: Pool;
  defaultScope?: ScopeRef;
};

function nowIso() {
  return new Date().toISOString();
}

function stableId(prefix: string, ...parts: string[]) {
  const hash = createHash("sha256").update(parts.join("\0")).digest("hex").slice(0, 32);
  return `${prefix}_${hash}`;
}

function toIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}

function manifestPackageName(manifest: PicoAppManifest | PicoServiceManifest) {
  return manifest.packageName ?? manifest.id;
}

function runServiceRef(record: RunRecord) {
  if (record.servicePackageName && record.serviceVersion !== undefined) {
    return `${record.servicePackageName}@${record.serviceVersion}`;
  }
  return record.servicePackageName ?? DEFAULT_SERVICE_REF;
}

function parseServiceRef(serviceRef: string) {
  const separator = serviceRef.lastIndexOf("@");
  if (separator <= 0) {
    return {
      servicePackageName: serviceRef,
      serviceVersion: undefined
    };
  }

  const version = Number(serviceRef.slice(separator + 1));
  return {
    servicePackageName: serviceRef.slice(0, separator),
    serviceVersion: Number.isFinite(version) ? version : undefined
  };
}

async function ensureWorkspace(pool: PoolLike, workspaceId: string) {
  const timestamp = nowIso();
  await pool.query(
    `
      INSERT INTO workspaces (workspace_id, name, created_at, updated_at)
      VALUES ($1, $2, $3, $3)
      ON CONFLICT (workspace_id)
      DO UPDATE SET updated_at = EXCLUDED.updated_at;
    `,
    [workspaceId, workspaceId, timestamp]
  );
}

async function ensureOrg(pool: PoolLike, scope: ScopeRef) {
  if (!scope.orgId) {
    return;
  }

  const timestamp = nowIso();
  await pool.query(
    `
      INSERT INTO orgs (org_id, workspace_id, name, slug, created_at, updated_at)
      VALUES ($1, $2, $1, $1, $3, $3)
      ON CONFLICT (org_id)
      DO UPDATE SET updated_at = EXCLUDED.updated_at;
    `,
    [scope.orgId, scope.workspaceId, timestamp]
  );
}

async function ensureGroup(pool: PoolLike, scope: ScopeRef) {
  if (!scope.groupId) {
    return;
  }

  const timestamp = nowIso();
  await pool.query(
    `
      INSERT INTO groups (group_id, workspace_id, slug, display_name, created_at, updated_at)
      VALUES ($1, $2, $1, $1, $3, $3)
      ON CONFLICT (group_id)
      DO UPDATE SET updated_at = EXCLUDED.updated_at;
    `,
    [scope.groupId, scope.workspaceId, timestamp]
  );
}

async function ensureProject(pool: PoolLike, scope: ScopeRef) {
  if (!scope.projectId) {
    return;
  }

  const timestamp = nowIso();
  await pool.query(
    `
      INSERT INTO projects (project_id, workspace_id, org_id, name, created_at, updated_at)
      VALUES ($1, $2, $3, $1, $4, $4)
      ON CONFLICT (project_id)
      DO UPDATE SET updated_at = EXCLUDED.updated_at;
    `,
    [scope.projectId, scope.workspaceId, scope.orgId ?? null, timestamp]
  );
}

async function ensureScope(pool: PoolLike, scope: ScopeRef) {
  await ensureWorkspace(pool, scope.workspaceId);
  await ensureOrg(pool, scope);
  await ensureGroup(pool, scope);
  await ensureProject(pool, scope);
}

async function ensureActor(pool: PoolLike, workspaceId: string, actorId: string) {
  const timestamp = nowIso();
  await ensureWorkspace(pool, workspaceId);
  await pool.query(
    `
      INSERT INTO actors (actor_id, workspace_id, kind, handle, display_name, email, created_at, updated_at)
      VALUES ($1, $2, 'system', $1, $1, NULL, $3, $3)
      ON CONFLICT (actor_id)
      DO UPDATE SET updated_at = EXCLUDED.updated_at;
    `,
    [actorId, workspaceId, timestamp]
  );
}

function addScopeFilters(
  clauses: string[],
  values: unknown[],
  scope: ScopeRef,
  prefix = ""
) {
  clauses.push(`${prefix}workspace_id = $${values.length + 1}`);
  values.push(scope.workspaceId);

  for (const [column, value] of [
    ["org_id", scope.orgId],
    ["group_id", scope.groupId],
    ["project_id", scope.projectId],
    ["app_installation_id", scope.appInstallationId]
  ] as const) {
    if (value === undefined) {
      clauses.push(`${prefix}${column} IS NULL`);
    } else {
      clauses.push(`${prefix}${column} = $${values.length + 1}`);
      values.push(value);
    }
  }
}

function manifestRecordFromRow(row: {
  manifest_id: string;
  resource_id: string;
  kind: string;
  workspace_id: string;
  org_id: string | null;
  group_id: string | null;
  project_id: string | null;
  app_installation_id: string | null;
  version: number;
  lifecycle_state: string;
  manifest: PlatformManifest;
  created_at: Date | string;
  updated_at: Date | string;
}): ManifestRecord {
  return {
    manifestId: row.manifest_id,
    resourceId: row.resource_id,
    kind: row.kind as ManifestRecord["kind"],
    scope: {
      workspaceId: row.workspace_id,
      ...(row.org_id ? { orgId: row.org_id } : {}),
      ...(row.group_id ? { groupId: row.group_id } : {}),
      ...(row.project_id ? { projectId: row.project_id } : {}),
      ...(row.app_installation_id ? { appInstallationId: row.app_installation_id } : {})
    },
    version: row.version,
    lifecycleState: row.lifecycle_state as ManifestLifecycleState,
    manifest: row.manifest,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

function runRecordFromRow(row: {
  execution_id: string;
  workspace_id: string;
  org_id: string | null;
  project_id: string | null;
  app_installation_id: string | null;
  app_id: string;
  agent_id: string | null;
  harness_id: string | null;
  conversation_id: string | null;
  action_id: string | null;
  actor_id: string;
  service_ref: string;
  policy_snapshot_id: string | null;
  binding_snapshot_id: string | null;
  schema_versions: Record<string, string>;
  status: string;
  output: string | null;
  error: string | null;
  started_at: Date | string;
  completed_at: Date | string | null;
}): RunRecord {
  const service = parseServiceRef(row.service_ref);
  return {
    runId: row.execution_id,
    scope: {
      workspaceId: row.workspace_id,
      ...(row.org_id ? { orgId: row.org_id } : {}),
      ...(row.project_id ? { projectId: row.project_id } : {}),
      ...(row.app_installation_id ? { appInstallationId: row.app_installation_id } : {})
    },
    appId: row.app_id,
    ...(row.action_id ? { actionId: row.action_id } : {}),
    actorId: row.actor_id,
    servicePackageName: service.servicePackageName,
    ...(service.serviceVersion === undefined ? {} : { serviceVersion: service.serviceVersion }),
    ...(row.policy_snapshot_id ? { policySnapshotId: row.policy_snapshot_id } : {}),
    ...(row.binding_snapshot_id ? { bindingSnapshotId: row.binding_snapshot_id } : {}),
    schemaVersions: row.schema_versions ?? {},
    agentId: row.agent_id ?? "unknown-agent",
    harnessId: row.harness_id ?? "unknown-harness",
    conversationId: row.conversation_id ?? "unknown-conversation",
    status: row.status as RunRecord["status"],
    startedAt: toIso(row.started_at),
    ...(row.completed_at ? { completedAt: toIso(row.completed_at) } : {}),
    ...(row.output ? { output: row.output } : {}),
    ...(row.error ? { error: row.error } : {})
  };
}

export class PostgresAccessGraphRepository implements AccessGraphRepository {
  constructor(private readonly pool: PoolLike) {}

  async upsertActor(record: ActorRecord): Promise<ActorRecord> {
    await ensureWorkspace(this.pool, record.workspaceId);
    const result = await this.pool.query(
      `
        INSERT INTO actors (actor_id, workspace_id, kind, handle, display_name, email, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (actor_id)
        DO UPDATE SET
          workspace_id = EXCLUDED.workspace_id,
          kind = EXCLUDED.kind,
          handle = EXCLUDED.handle,
          display_name = EXCLUDED.display_name,
          email = EXCLUDED.email,
          updated_at = EXCLUDED.updated_at
        RETURNING *;
      `,
      [
        record.actorId,
        record.workspaceId,
        record.kind,
        record.handle,
        record.displayName,
        record.email ?? null,
        record.createdAt,
        record.updatedAt
      ]
    );
    const row = result.rows[0];
    return {
      actorId: row.actor_id,
      workspaceId: row.workspace_id,
      kind: row.kind as ActorKind,
      handle: row.handle,
      displayName: row.display_name,
      ...(row.email ? { email: row.email } : {}),
      createdAt: toIso(row.created_at),
      updatedAt: toIso(row.updated_at)
    };
  }

  async upsertGroup(record: GroupRecord): Promise<GroupRecord> {
    await ensureWorkspace(this.pool, record.workspaceId);
    const result = await this.pool.query(
      `
        INSERT INTO groups (group_id, workspace_id, slug, display_name, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (group_id)
        DO UPDATE SET
          workspace_id = EXCLUDED.workspace_id,
          slug = EXCLUDED.slug,
          display_name = EXCLUDED.display_name,
          updated_at = EXCLUDED.updated_at
        RETURNING *;
      `,
      [
        record.groupId,
        record.workspaceId,
        record.slug,
        record.displayName,
        record.createdAt,
        record.updatedAt
      ]
    );
    const row = result.rows[0];
    return {
      groupId: row.group_id,
      workspaceId: row.workspace_id,
      slug: row.slug,
      displayName: row.display_name,
      createdAt: toIso(row.created_at),
      updatedAt: toIso(row.updated_at)
    };
  }

  async upsertIdentity(record: IdentityRecord): Promise<IdentityRecord> {
    await ensureWorkspace(this.pool, record.workspaceId);
    const result = await this.pool.query(
      `
        INSERT INTO identities (identity_id, workspace_id, provider, external_id, kind, maps_to_type, maps_to_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (identity_id)
        DO UPDATE SET
          workspace_id = EXCLUDED.workspace_id,
          provider = EXCLUDED.provider,
          external_id = EXCLUDED.external_id,
          kind = EXCLUDED.kind,
          maps_to_type = EXCLUDED.maps_to_type,
          maps_to_id = EXCLUDED.maps_to_id,
          updated_at = EXCLUDED.updated_at
        RETURNING *;
      `,
      [
        record.identityId,
        record.workspaceId,
        record.provider,
        record.externalId,
        record.kind,
        record.mapsToType,
        record.mapsToId,
        record.createdAt,
        record.updatedAt
      ]
    );
    const row = result.rows[0];
    return {
      identityId: row.identity_id,
      workspaceId: row.workspace_id,
      provider: row.provider,
      externalId: row.external_id,
      kind: row.kind as IdentityKind,
      mapsToType: row.maps_to_type,
      mapsToId: row.maps_to_id,
      createdAt: toIso(row.created_at),
      updatedAt: toIso(row.updated_at)
    };
  }

  async addGrant(record: GrantRecord): Promise<GrantRecord> {
    await ensureWorkspace(this.pool, record.workspaceId);
    const result = await this.pool.query(
      `
        INSERT INTO grants (grant_id, workspace_id, grantee_type, grantee_id, relation, resource_type, resource_id, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (workspace_id, grantee_type, grantee_id, relation, resource_type, resource_id)
        DO UPDATE SET grant_id = EXCLUDED.grant_id
        RETURNING *;
      `,
      [
        record.grantId,
        record.workspaceId,
        record.granteeType,
        record.granteeId,
        record.relation,
        record.resourceType,
        record.resourceId,
        record.createdAt
      ]
    );
    const row = result.rows[0];
    return {
      grantId: row.grant_id,
      workspaceId: row.workspace_id,
      granteeType: row.grantee_type,
      granteeId: row.grantee_id,
      relation: row.relation,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      createdAt: toIso(row.created_at)
    };
  }

  async listGrants(filter?: GrantListFilter): Promise<GrantRecord[]> {
    const clauses: string[] = [];
    const values: unknown[] = [];
    for (const [column, value] of [
      ["workspace_id", filter?.workspaceId],
      ["grantee_type", filter?.granteeType],
      ["grantee_id", filter?.granteeId],
      ["relation", filter?.relation],
      ["resource_type", filter?.resourceType],
      ["resource_id", filter?.resourceId]
    ] as const) {
      if (value !== undefined) {
        clauses.push(`${column} = $${values.length + 1}`);
        values.push(value);
      }
    }

    const result = await this.pool.query(
      `
        SELECT * FROM grants
        ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
        ORDER BY grant_id ASC;
      `,
      values
    );
    return result.rows.map((row) => ({
      grantId: row.grant_id,
      workspaceId: row.workspace_id,
      granteeType: row.grantee_type,
      granteeId: row.grantee_id,
      relation: row.relation,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      createdAt: toIso(row.created_at)
    }));
  }
}

export class PostgresManifestRegistry implements ManifestRegistry {
  constructor(private readonly pool: PoolLike) {}

  async registerManifest(options: {
    scope: ScopeRef;
    manifest: PlatformManifest;
    lifecycleState?: ManifestLifecycleState;
  }): Promise<ManifestRecord> {
    await ensureScope(this.pool, options.scope);
    const timestamp = nowIso();
    const manifestId = stableId(
      "manifest",
      options.scope.workspaceId,
      options.scope.orgId ?? "",
      options.scope.groupId ?? "",
      options.scope.projectId ?? "",
      options.scope.appInstallationId ?? "",
      options.manifest.kind,
      options.manifest.id,
      String(options.manifest.version)
    );
    const lifecycleState = options.lifecycleState ?? "active";

    const result = await this.pool.query(
      `
        INSERT INTO manifest_records (
          manifest_id, workspace_id, org_id, group_id, project_id, app_installation_id,
          resource_id, kind, version, lifecycle_state, manifest, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $12)
        ON CONFLICT (manifest_id)
        DO UPDATE SET
          lifecycle_state = EXCLUDED.lifecycle_state,
          manifest = EXCLUDED.manifest,
          updated_at = EXCLUDED.updated_at
        RETURNING *;
      `,
      [
        manifestId,
        options.scope.workspaceId,
        options.scope.orgId ?? null,
        options.scope.groupId ?? null,
        options.scope.projectId ?? null,
        options.scope.appInstallationId ?? null,
        options.manifest.id,
        options.manifest.kind,
        options.manifest.version,
        lifecycleState,
        JSON.stringify(options.manifest),
        timestamp
      ]
    );

    if (options.manifest.kind === "pico.app") {
      await this.projectAppManifest(options.scope, options.manifest, lifecycleState, timestamp);
    } else if (options.manifest.kind === "pico.service") {
      await this.projectServiceManifest(options.scope, options.manifest, lifecycleState, timestamp);
    }

    return manifestRecordFromRow(result.rows[0]);
  }

  async listManifests(options?: {
    scope?: ScopeRef;
    kind?: PlatformManifest["kind"];
    resourceId?: string;
    lifecycleStates?: ManifestLifecycleState[];
  }): Promise<ManifestRecord[]> {
    const clauses: string[] = [];
    const values: unknown[] = [];
    if (options?.scope) {
      addScopeFilters(clauses, values, options.scope);
    }
    if (options?.kind) {
      clauses.push(`kind = $${values.length + 1}`);
      values.push(options.kind);
    }
    if (options?.resourceId) {
      clauses.push(`resource_id = $${values.length + 1}`);
      values.push(options.resourceId);
    }
    if (options?.lifecycleStates?.length) {
      clauses.push(`lifecycle_state = ANY($${values.length + 1})`);
      values.push(options.lifecycleStates);
    }

    const result = await this.pool.query(
      `
        SELECT * FROM manifest_records
        ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
        ORDER BY kind ASC, resource_id ASC, version DESC;
      `,
      values
    );
    return result.rows.map(manifestRecordFromRow);
  }

  async resolveManifest(options: {
    scope: ScopeRef;
    kind: PlatformManifest["kind"];
    resourceId: string;
    version?: number;
    lifecycleStates?: ManifestLifecycleState[];
  }): Promise<ManifestRecord | null> {
    const manifests = await this.listManifests({
      scope: options.scope,
      kind: options.kind,
      resourceId: options.resourceId,
      lifecycleStates: options.lifecycleStates ?? ["active"]
    });
    if (options.version !== undefined) {
      return manifests.find((manifest) => manifest.version === options.version) ?? null;
    }
    return manifests[0] ?? null;
  }

  private async projectAppManifest(
    scope: ScopeRef,
    manifest: PicoAppManifest,
    lifecycleState: ManifestLifecycleState,
    timestamp: string
  ) {
    const packageName = manifestPackageName(manifest);
    const appPackageId = stableId("app_package", scope.workspaceId, packageName);
    const appVersionId = stableId("app_version", scope.workspaceId, packageName, String(manifest.version));

    await this.pool.query(
      `
        INSERT INTO app_packages (app_package_id, workspace_id, org_id, package_name, display_name, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $6)
        ON CONFLICT (workspace_id, package_name)
        DO UPDATE SET display_name = EXCLUDED.display_name, updated_at = EXCLUDED.updated_at;
      `,
      [appPackageId, scope.workspaceId, scope.orgId ?? null, packageName, manifest.name ?? packageName, timestamp]
    );
    await this.pool.query(
      `
        INSERT INTO app_versions (app_version_id, app_package_id, version, manifest, lifecycle_state, created_at, updated_at)
        VALUES ($1, $2, $3, $4::jsonb, $5, $6, $6)
        ON CONFLICT (app_package_id, version)
        DO UPDATE SET manifest = EXCLUDED.manifest, lifecycle_state = EXCLUDED.lifecycle_state, updated_at = EXCLUDED.updated_at;
      `,
      [appVersionId, appPackageId, manifest.version, JSON.stringify(manifest), lifecycleState, timestamp]
    );

    for (const [objectKey, object] of Object.entries(manifest.objects ?? {})) {
      await this.pool.query(
        `
          INSERT INTO object_types (object_type_id, workspace_id, app_version_id, type_key, schema_ref, view_ref, visibility, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $8)
          ON CONFLICT (app_version_id, type_key)
          DO UPDATE SET schema_ref = EXCLUDED.schema_ref, view_ref = EXCLUDED.view_ref, visibility = EXCLUDED.visibility, updated_at = EXCLUDED.updated_at;
        `,
        [
          stableId("object_type", appVersionId, objectKey),
          scope.workspaceId,
          appVersionId,
          objectKey,
          object.schema,
          object.view ?? null,
          JSON.stringify(object.visibility ?? null),
          timestamp
        ]
      );
    }

    for (const [actionKey, action] of Object.entries(manifest.actions ?? {})) {
      await this.pool.query(
        `
          INSERT INTO action_definitions (
            action_definition_id, workspace_id, app_version_id, action_key, input_schema_ref,
            output_schema_ref, mutates, handler_ref, service_ref, visibility, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10::jsonb, $11, $11)
          ON CONFLICT (app_version_id, action_key)
          DO UPDATE SET
            input_schema_ref = EXCLUDED.input_schema_ref,
            output_schema_ref = EXCLUDED.output_schema_ref,
            mutates = EXCLUDED.mutates,
            handler_ref = EXCLUDED.handler_ref,
            service_ref = EXCLUDED.service_ref,
            visibility = EXCLUDED.visibility,
            updated_at = EXCLUDED.updated_at;
        `,
        [
          stableId("action_definition", appVersionId, actionKey),
          scope.workspaceId,
          appVersionId,
          actionKey,
          action.input ?? null,
          action.output ?? null,
          JSON.stringify(action.mutates ?? []),
          action.handler ?? null,
          action.uses ?? null,
          JSON.stringify(action.visibility ?? null),
          timestamp
        ]
      );
    }
  }

  private async projectServiceManifest(
    scope: ScopeRef,
    manifest: PicoServiceManifest,
    lifecycleState: ManifestLifecycleState,
    timestamp: string
  ) {
    const packageName = manifestPackageName(manifest);
    const servicePackageId = stableId("service_package", scope.workspaceId, packageName);
    const serviceVersionId = stableId("service_version", scope.workspaceId, packageName, String(manifest.version));

    await this.pool.query(
      `
        INSERT INTO service_packages (service_package_id, workspace_id, org_id, package_name, display_name, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $6)
        ON CONFLICT (workspace_id, package_name)
        DO UPDATE SET display_name = EXCLUDED.display_name, updated_at = EXCLUDED.updated_at;
      `,
      [servicePackageId, scope.workspaceId, scope.orgId ?? null, packageName, manifest.name ?? packageName, timestamp]
    );
    await this.pool.query(
      `
        INSERT INTO service_versions (service_version_id, service_package_id, version, manifest, lifecycle_state, created_at, updated_at)
        VALUES ($1, $2, $3, $4::jsonb, $5, $6, $6)
        ON CONFLICT (service_package_id, version)
        DO UPDATE SET manifest = EXCLUDED.manifest, lifecycle_state = EXCLUDED.lifecycle_state, updated_at = EXCLUDED.updated_at;
      `,
      [serviceVersionId, servicePackageId, manifest.version, JSON.stringify(manifest), lifecycleState, timestamp]
    );
  }
}

export class PostgresServiceCatalog implements ServiceCatalog {
  constructor(
    private readonly pool: PoolLike,
    private readonly defaultScope: ScopeRef = { workspaceId: DEFAULT_WORKSPACE_ID }
  ) {}

  async registerService(manifest: PicoServiceManifest): Promise<ServiceRecord> {
    const registry = new PostgresManifestRegistry(this.pool);
    const record = await registry.registerManifest({
      scope: this.defaultScope,
      manifest,
      lifecycleState: "active"
    });
    return {
      serviceId: manifest.id,
      manifest,
      lifecycleState: "published",
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
  }

  async getService(serviceId: string): Promise<ServiceRecord | null> {
    const result = await this.pool.query(
      `
        SELECT sv.* FROM service_versions sv
        WHERE sv.manifest ->> 'id' = $1
        ORDER BY sv.version DESC
        LIMIT 1;
      `,
      [serviceId]
    );
    const row = result.rows[0];
    if (!row) {
      return null;
    }
    return {
      serviceId,
      manifest: row.manifest,
      lifecycleState: row.lifecycle_state === "active" ? "published" : row.lifecycle_state,
      createdAt: toIso(row.created_at),
      updatedAt: toIso(row.updated_at)
    };
  }

  async listServices(scope?: ScopeRef): Promise<ServiceRecord[]> {
    const values: unknown[] = [];
    const scopeClause = scope ? "WHERE sp.workspace_id = $1" : "";
    if (scope) {
      values.push(scope.workspaceId);
    }
    const result = await this.pool.query(
      `
        SELECT sv.* FROM service_versions sv
        INNER JOIN service_packages sp ON sp.service_package_id = sv.service_package_id
        ${scopeClause}
        ORDER BY sp.package_name ASC, sv.version DESC;
      `,
      values
    );
    return result.rows.map((row) => ({
      serviceId: row.manifest.id,
      manifest: row.manifest,
      lifecycleState: row.lifecycle_state === "active" ? "published" : row.lifecycle_state,
      createdAt: toIso(row.created_at),
      updatedAt: toIso(row.updated_at)
    }));
  }
}

export class PostgresBindingResolver implements BindingResolver {
  constructor(private readonly pool: PoolLike) {}

  async registerBinding(scope: ScopeRef, manifest: PicoBindingManifest): Promise<BindingRecord[]> {
    await ensureScope(this.pool, scope);
    const timestamp = nowIso();
    const records: BindingRecord[] = [];

    for (const [requirement, binding] of Object.entries(manifest.bindings)) {
      const bindingId = stableId(
        "binding",
        scope.workspaceId,
        scope.projectId ?? "",
        manifest.environment,
        requirement
      );
      const result = await this.pool.query(
        `
          INSERT INTO bindings (binding_id, workspace_id, project_id, environment, requirement, provider, service_ref, capability_id, model, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
          ON CONFLICT (binding_id)
          DO UPDATE SET
            provider = EXCLUDED.provider,
            service_ref = EXCLUDED.service_ref,
            capability_id = EXCLUDED.capability_id,
            model = EXCLUDED.model,
            updated_at = EXCLUDED.updated_at
          RETURNING *;
        `,
        [
          bindingId,
          scope.workspaceId,
          scope.projectId ?? null,
          manifest.environment,
          requirement,
          binding.provider,
          binding.serviceId ?? null,
          binding.capabilityId ?? null,
          binding.model ?? null,
          timestamp
        ]
      );
      const row = result.rows[0];
      records.push({
        bindingId: row.binding_id,
        scope,
        environment: row.environment,
        requirement: row.requirement,
        provider: row.provider,
        ...(row.service_ref ? { serviceId: row.service_ref } : {}),
        ...(row.capability_id ? { capabilityId: row.capability_id } : {}),
        ...(row.model ? { model: row.model } : {}),
        createdAt: toIso(row.created_at),
        updatedAt: toIso(row.updated_at)
      });
    }

    await this.pool.query(
      `
        INSERT INTO binding_snapshots (binding_snapshot_id, binding_id, workspace_id, snapshot, created_at)
        VALUES ($1, $2, $3, $4::jsonb, $5)
        ON CONFLICT (binding_snapshot_id)
        DO UPDATE SET
          binding_id = EXCLUDED.binding_id,
          snapshot = EXCLUDED.snapshot;
      `,
      [
        manifest.id,
        records[0]?.bindingId ?? null,
        scope.workspaceId,
        JSON.stringify({
          scope,
          manifest,
          bindings: records
        }),
        timestamp
      ]
    );

    return records;
  }

  async resolveBinding(options: {
    scope: ScopeRef;
    environment: string;
    requirement: string;
  }): Promise<ResolvedBinding | null> {
    const result = await this.pool.query(
      `
        SELECT * FROM bindings
        WHERE workspace_id = $1
          AND project_id IS NOT DISTINCT FROM $2
          AND environment = $3
          AND requirement = $4
        ORDER BY updated_at DESC
        LIMIT 1;
      `,
      [options.scope.workspaceId, options.scope.projectId ?? null, options.environment, options.requirement]
    );
    const row = result.rows[0];
    return row
      ? {
          requirement: row.requirement,
          provider: row.provider,
          ...(row.service_ref ? { serviceId: row.service_ref } : {}),
          ...(row.capability_id ? { capabilityId: row.capability_id } : {}),
          ...(row.model ? { model: row.model } : {})
        }
      : null;
  }
}

export class PostgresRunRepository implements RunRepository {
  constructor(private readonly pool: PoolLike) {}

  async createRun(record: RunRecord): Promise<RunRecord> {
    return this.upsertRun(record);
  }

  async updateRun(record: RunRecord): Promise<RunRecord> {
    return this.upsertRun(record);
  }

  async getRun(runId: string): Promise<RunRecord | null> {
    const result = await this.pool.query("SELECT * FROM executions WHERE execution_id = $1;", [runId]);
    return result.rows[0] ? runRecordFromRow(result.rows[0]) : null;
  }

  async listRuns(scope?: ScopeRef): Promise<RunRecord[]> {
    const clauses: string[] = [];
    const values: unknown[] = [];
    if (scope) {
      clauses.push("workspace_id = $1");
      values.push(scope.workspaceId);
      if (scope.projectId === undefined) {
        clauses.push("project_id IS NULL");
      } else {
        clauses.push(`project_id = $${values.length + 1}`);
        values.push(scope.projectId);
      }
    }
    const result = await this.pool.query(
      `
        SELECT * FROM executions
        ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
        ORDER BY started_at DESC;
      `,
      values
    );
    return result.rows.map(runRecordFromRow);
  }

  private async upsertRun(record: RunRecord) {
    const actorId = record.actorId ?? DEFAULT_ACTOR_ID;
    await ensureScope(this.pool, record.scope);
    await ensureActor(this.pool, record.scope.workspaceId, actorId);
    const serviceRef = runServiceRef(record);
    const result = await this.pool.query(
      `
        INSERT INTO executions (
          execution_id, workspace_id, org_id, project_id, app_installation_id, app_id,
          agent_id, harness_id, conversation_id, action_id, actor_id, service_ref,
          policy_snapshot_id, binding_snapshot_id, schema_versions, status, output,
          error, started_at, completed_at
        )
        VALUES ($1, $2, $3, $4, NULL, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15, $16, $17, $18, $19)
        ON CONFLICT (execution_id)
        DO UPDATE SET
          status = EXCLUDED.status,
          output = EXCLUDED.output,
          error = EXCLUDED.error,
          completed_at = EXCLUDED.completed_at,
          action_id = EXCLUDED.action_id,
          actor_id = EXCLUDED.actor_id,
          service_ref = EXCLUDED.service_ref,
          policy_snapshot_id = EXCLUDED.policy_snapshot_id,
          binding_snapshot_id = EXCLUDED.binding_snapshot_id,
          schema_versions = EXCLUDED.schema_versions
        RETURNING *;
      `,
      [
        record.runId,
        record.scope.workspaceId,
        record.scope.orgId ?? null,
        record.scope.projectId ?? null,
        record.appId,
        record.agentId,
        record.harnessId,
        record.conversationId,
        record.actionId ?? null,
        actorId,
        serviceRef,
        record.policySnapshotId ?? null,
        record.bindingSnapshotId ?? null,
        JSON.stringify(record.schemaVersions ?? {}),
        record.status,
        record.output ?? null,
        record.error ?? null,
        record.startedAt,
        record.completedAt ?? null
      ]
    );
    return runRecordFromRow(result.rows[0]);
  }
}

export class PostgresTraceRepository implements TraceRepository {
  constructor(private readonly pool: PoolLike) {}

  async appendTrace(record: TraceRecord): Promise<TraceRecord> {
    const result = await this.pool.query(
      `
        INSERT INTO traces (trace_id, execution_id, event_type, message, metadata, created_at)
        VALUES ($1, $2, $3, $4, $5::jsonb, $6)
        ON CONFLICT (trace_id)
        DO UPDATE SET event_type = EXCLUDED.event_type, message = EXCLUDED.message, metadata = EXCLUDED.metadata
        RETURNING *;
      `,
      [
        record.traceId,
        record.runId,
        record.eventType,
        record.message,
        JSON.stringify(record.metadata ?? null),
        record.createdAt
      ]
    );
    const row = result.rows[0];
    return {
      traceId: row.trace_id,
      runId: row.execution_id,
      eventType: row.event_type,
      message: row.message,
      ...(row.metadata ? { metadata: row.metadata } : {}),
      createdAt: toIso(row.created_at)
    };
  }

  async listTraces(runId: string): Promise<TraceRecord[]> {
    const result = await this.pool.query(
      "SELECT * FROM traces WHERE execution_id = $1 ORDER BY created_at ASC, trace_id ASC;",
      [runId]
    );
    return result.rows.map((row) => ({
      traceId: row.trace_id,
      runId: row.execution_id,
      eventType: row.event_type,
      message: row.message,
      ...(row.metadata ? { metadata: row.metadata } : {}),
      createdAt: toIso(row.created_at)
    }));
  }
}

export class PostgresMemoryRepository implements MemoryRepository {
  constructor(private readonly pool: PoolLike) {}

  async writeMemory(record: MemoryRecord): Promise<MemoryRecord> {
    await ensureScope(this.pool, record.scope);
    const result = await this.pool.query(
      `
        INSERT INTO memory_records (memory_id, workspace_id, project_id, kind, content, source_execution_id, embedding, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NULL, $7)
        ON CONFLICT (memory_id)
        DO UPDATE SET kind = EXCLUDED.kind, content = EXCLUDED.content, source_execution_id = EXCLUDED.source_execution_id
        RETURNING *;
      `,
      [
        record.memoryId,
        record.scope.workspaceId,
        record.scope.projectId ?? null,
        record.kind,
        record.content,
        record.sourceRunId ?? null,
        record.createdAt
      ]
    );
    const row = result.rows[0];
    return {
      memoryId: row.memory_id,
      scope: {
        workspaceId: row.workspace_id,
        ...(row.project_id ? { projectId: row.project_id } : {})
      },
      kind: row.kind,
      content: row.content,
      ...(row.source_execution_id ? { sourceRunId: row.source_execution_id } : {}),
      createdAt: toIso(row.created_at)
    };
  }

  async listMemory(scope: ScopeRef): Promise<MemoryRecord[]> {
    const result = await this.pool.query(
      `
        SELECT * FROM memory_records
        WHERE workspace_id = $1 AND project_id IS NOT DISTINCT FROM $2
        ORDER BY created_at ASC, memory_id ASC;
      `,
      [scope.workspaceId, scope.projectId ?? null]
    );
    return result.rows.map((row) => ({
      memoryId: row.memory_id,
      scope: {
        workspaceId: row.workspace_id,
        ...(row.project_id ? { projectId: row.project_id } : {})
      },
      kind: row.kind,
      content: row.content,
      ...(row.source_execution_id ? { sourceRunId: row.source_execution_id } : {}),
      createdAt: toIso(row.created_at)
    }));
  }
}

export class PostgresArtifactRepository implements ArtifactRepository {
  constructor(private readonly pool: PoolLike) {}

  async createArtifact(record: ArtifactRecord): Promise<ArtifactRecord> {
    await ensureScope(this.pool, record.scope);
    const result = await this.pool.query(
      `
        INSERT INTO artifacts (artifact_id, workspace_id, project_id, object_uri, content_type, size_bytes, checksum, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (artifact_id)
        DO UPDATE SET object_uri = EXCLUDED.object_uri, content_type = EXCLUDED.content_type, size_bytes = EXCLUDED.size_bytes, checksum = EXCLUDED.checksum
        RETURNING *;
      `,
      [
        record.artifactId,
        record.scope.workspaceId,
        record.scope.projectId ?? null,
        record.objectUri,
        record.contentType,
        record.sizeBytes,
        record.checksum ?? null,
        record.createdAt
      ]
    );
    return this.artifactFromRow(result.rows[0]);
  }

  async getArtifact(artifactId: string): Promise<ArtifactRecord | null> {
    const result = await this.pool.query("SELECT * FROM artifacts WHERE artifact_id = $1;", [artifactId]);
    return result.rows[0] ? this.artifactFromRow(result.rows[0]) : null;
  }

  async listArtifacts(scope: ScopeRef): Promise<ArtifactRecord[]> {
    const values: unknown[] = [scope.workspaceId];
    const clauses = ["workspace_id = $1"];
    if (scope.projectId === undefined) {
      clauses.push("project_id IS NULL");
    } else {
      clauses.push(`project_id = $${values.length + 1}`);
      values.push(scope.projectId);
    }
    const result = await this.pool.query(
      `
        SELECT * FROM artifacts
        WHERE ${clauses.join(" AND ")}
        ORDER BY created_at DESC, artifact_id ASC;
      `,
      values
    );
    return result.rows.map((row) => this.artifactFromRow(row));
  }

  private artifactFromRow(row: {
    artifact_id: string;
    workspace_id: string;
    project_id: string | null;
    object_uri: string;
    content_type: string;
    size_bytes: number;
    checksum: string | null;
    created_at: Date | string;
  }): ArtifactRecord {
    return {
      artifactId: row.artifact_id,
      scope: {
        workspaceId: row.workspace_id,
        ...(row.project_id ? { projectId: row.project_id } : {})
      },
      objectUri: row.object_uri,
      contentType: row.content_type,
      sizeBytes: row.size_bytes,
      ...(row.checksum ? { checksum: row.checksum } : {}),
      createdAt: toIso(row.created_at)
    };
  }
}

export class PostgresUsageLedger implements UsageLedger {
  constructor(private readonly pool: PoolLike) {}

  async recordUsage(record: UsageRecord): Promise<UsageRecord> {
    await ensureScope(this.pool, record.scope);
    const result = await this.pool.query(
      `
        INSERT INTO usage_records (usage_id, workspace_id, project_id, execution_id, provider, model, input_tokens, output_tokens, cost_micros, currency, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NULL, NULL, NULL, NULL, $7)
        ON CONFLICT (usage_id)
        DO UPDATE SET provider = EXCLUDED.provider, model = EXCLUDED.model
        RETURNING *;
      `,
      [
        record.usageId,
        record.scope.workspaceId,
        record.scope.projectId ?? null,
        record.runId,
        record.provider,
        record.model ?? null,
        record.createdAt
      ]
    );
    return this.usageFromRow(result.rows[0]);
  }

  async listUsage(scope?: ScopeRef): Promise<UsageRecord[]> {
    const clauses: string[] = [];
    const values: unknown[] = [];
    if (scope) {
      clauses.push("workspace_id = $1");
      values.push(scope.workspaceId);
      if (scope.projectId === undefined) {
        clauses.push("project_id IS NULL");
      } else {
        clauses.push(`project_id = $${values.length + 1}`);
        values.push(scope.projectId);
      }
    }
    const result = await this.pool.query(
      `
        SELECT * FROM usage_records
        ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
        ORDER BY created_at ASC, usage_id ASC;
      `,
      values
    );
    return result.rows.map((row) => this.usageFromRow(row));
  }

  private usageFromRow(row: {
    usage_id: string;
    workspace_id: string;
    project_id: string | null;
    execution_id: string | null;
    provider: string | null;
    model: string | null;
    created_at: Date | string;
  }): UsageRecord {
    return {
      usageId: row.usage_id,
      scope: {
        workspaceId: row.workspace_id,
        ...(row.project_id ? { projectId: row.project_id } : {})
      },
      ...(row.execution_id ? { runId: row.execution_id } : {}),
      ...(row.provider ? { provider: row.provider } : {}),
      ...(row.model ? { model: row.model } : {}),
      createdAt: toIso(row.created_at)
    };
  }
}

export function createPostgresCoreRepositories(options: PostgresRepositoryOptions) {
  const pool = options.pool ?? new Pool(
    options.connectionString ? { connectionString: options.connectionString } : ({} as PoolConfig)
  );
  const defaultScope = options.defaultScope ?? { workspaceId: DEFAULT_WORKSPACE_ID };

  return {
    accessGraphRepository: new PostgresAccessGraphRepository(pool),
    manifestRegistry: new PostgresManifestRegistry(pool),
    serviceCatalog: new PostgresServiceCatalog(pool, defaultScope),
    bindingResolver: new PostgresBindingResolver(pool),
    runRepository: new PostgresRunRepository(pool),
    traceRepository: new PostgresTraceRepository(pool),
    memoryRepository: new PostgresMemoryRepository(pool),
    artifactRepository: new PostgresArtifactRepository(pool),
    usageLedger: new PostgresUsageLedger(pool),
    close: () => pool.end()
  };
}

export function createCoreRepositories(options?: PostgresRepositoryOptions) {
  const connectionString =
    options?.connectionString === undefined
      ? process.env.CORE_DATABASE_URL ?? process.env.DATABASE_URL
      : options.connectionString;

  if (options?.pool || connectionString) {
    return createPostgresCoreRepositories({
      ...options,
      connectionString
    });
  }

  return createInMemoryCoreRepositories();
}
