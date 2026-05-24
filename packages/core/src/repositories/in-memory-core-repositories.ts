import type {
  AccessGraphRepository,
  ArtifactRepository,
  BindingResolver,
  GrantListFilter,
  ManifestRegistry,
  MemoryRepository,
  RunRepository,
  ServiceCatalog,
  TraceRepository,
  UsageLedger
} from "@neutrino/ports";
import type {
  ActorRecord,
  ArtifactRecord,
  BindingRecord,
  GrantRecord,
  GroupRecord,
  IdentityRecord,
  ManifestLifecycleState,
  ManifestRecord,
  MemoryRecord,
  PlatformManifest,
  PicoBindingManifest,
  PicoServiceManifest,
  RunRecord,
  ScopeRef,
  ServiceRecord,
  TraceRecord,
  UsageRecord
} from "@neutrino/schema";

function nowIso() {
  return new Date().toISOString();
}

function sameScope(left: ScopeRef, right: ScopeRef) {
  return left.workspaceId === right.workspaceId &&
    left.projectId === right.projectId &&
    left.orgId === right.orgId &&
    left.groupId === right.groupId &&
    left.appInstallationId === right.appInstallationId;
}

export class InMemoryAccessGraphRepository implements AccessGraphRepository {
  private readonly actors = new Map<string, ActorRecord>();
  private readonly groups = new Map<string, GroupRecord>();
  private readonly identities = new Map<string, IdentityRecord>();
  private readonly grants = new Map<string, GrantRecord>();

  async upsertActor(record: ActorRecord): Promise<ActorRecord> {
    this.actors.set(record.actorId, record);
    return record;
  }

  async upsertGroup(record: GroupRecord): Promise<GroupRecord> {
    this.groups.set(record.groupId, record);
    return record;
  }

  async upsertIdentity(record: IdentityRecord): Promise<IdentityRecord> {
    this.identities.set(record.identityId, record);
    return record;
  }

  async addGrant(record: GrantRecord): Promise<GrantRecord> {
    this.grants.set(record.grantId, record);
    return record;
  }

  async listGrants(filter?: GrantListFilter): Promise<GrantRecord[]> {
    return Array.from(this.grants.values())
      .filter((grant) => {
        if (filter?.workspaceId && grant.workspaceId !== filter.workspaceId) {
          return false;
        }
        if (filter?.granteeType && grant.granteeType !== filter.granteeType) {
          return false;
        }
        if (filter?.granteeId && grant.granteeId !== filter.granteeId) {
          return false;
        }
        if (filter?.relation && grant.relation !== filter.relation) {
          return false;
        }
        if (filter?.resourceType && grant.resourceType !== filter.resourceType) {
          return false;
        }
        if (filter?.resourceId && grant.resourceId !== filter.resourceId) {
          return false;
        }
        return true;
      })
      .sort((left, right) => left.grantId.localeCompare(right.grantId));
  }
}

export class InMemoryServiceCatalog implements ServiceCatalog {
  private readonly services = new Map<string, ServiceRecord>();

  async registerService(manifest: PicoServiceManifest): Promise<ServiceRecord> {
    const timestamp = nowIso();
    const record: ServiceRecord = {
      serviceId: manifest.id,
      manifest,
      lifecycleState: "draft",
      createdAt: timestamp,
      updatedAt: timestamp
    };
    this.services.set(record.serviceId, record);
    return record;
  }

  async getService(serviceId: string): Promise<ServiceRecord | null> {
    return this.services.get(serviceId) ?? null;
  }

  async listServices(): Promise<ServiceRecord[]> {
    return Array.from(this.services.values()).sort((a, b) =>
      a.serviceId.localeCompare(b.serviceId)
    );
  }
}

export class InMemoryBindingResolver implements BindingResolver {
  private readonly bindings = new Map<string, BindingRecord>();

  async registerBinding(scope: ScopeRef, manifest: PicoBindingManifest): Promise<BindingRecord[]> {
    const timestamp = nowIso();
    const records = Object.entries(manifest.bindings).map(([requirement, binding]) => {
      const record: BindingRecord = {
        bindingId: `${scope.workspaceId}:${scope.projectId ?? "workspace"}:${manifest.environment}:${requirement}`,
        scope,
        environment: manifest.environment,
        requirement,
        provider: binding.provider,
        serviceId: binding.serviceId,
        capabilityId: binding.capabilityId,
        model: binding.model,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      this.bindings.set(record.bindingId, record);
      return record;
    });
    return records;
  }

  async resolveBinding(options: {
    scope: ScopeRef;
    environment: string;
    requirement: string;
  }) {
    const records = Array.from(this.bindings.values());
    const record = records.find(
      (candidate) =>
        candidate.environment === options.environment &&
        candidate.requirement === options.requirement &&
        sameScope(candidate.scope, options.scope)
    );

    if (!record) {
      return null;
    }

    return {
      requirement: record.requirement,
      provider: record.provider,
      serviceId: record.serviceId,
      capabilityId: record.capabilityId,
      model: record.model
    };
  }
}

export class InMemoryManifestRegistry implements ManifestRegistry {
  private readonly records: ManifestRecord[] = [];

  async registerManifest(options: {
    scope: ScopeRef;
    manifest: PlatformManifest;
    lifecycleState?: ManifestLifecycleState;
  }): Promise<ManifestRecord> {
    const timestamp = nowIso();
    const record: ManifestRecord = {
      manifestId: `manifest_${crypto.randomUUID().replace(/-/g, "")}`,
      resourceId: options.manifest.id,
      kind: options.manifest.kind,
      scope: options.scope,
      version: options.manifest.version,
      lifecycleState: options.lifecycleState ?? "active",
      manifest: options.manifest,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    this.records.push(record);
    return record;
  }

  async listManifests(options?: {
    scope?: ScopeRef;
    kind?: PlatformManifest["kind"];
    resourceId?: string;
    lifecycleStates?: ManifestLifecycleState[];
  }): Promise<ManifestRecord[]> {
    return this.records
      .filter((record) => {
        if (options?.scope && !sameScope(record.scope, options.scope)) {
          return false;
        }
        if (options?.kind && record.kind !== options.kind) {
          return false;
        }
        if (options?.resourceId && record.resourceId !== options.resourceId) {
          return false;
        }
        if (options?.lifecycleStates && !options.lifecycleStates.includes(record.lifecycleState)) {
          return false;
        }
        return true;
      })
      .sort((left, right) => {
        if (left.kind !== right.kind) {
          return left.kind.localeCompare(right.kind);
        }
        if (left.resourceId !== right.resourceId) {
          return left.resourceId.localeCompare(right.resourceId);
        }
        return right.version - left.version;
      });
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
}

export class InMemoryRunRepository implements RunRepository {
  private readonly runs = new Map<string, RunRecord>();

  async createRun(record: RunRecord): Promise<RunRecord> {
    this.runs.set(record.runId, record);
    return record;
  }

  async updateRun(record: RunRecord): Promise<RunRecord> {
    this.runs.set(record.runId, record);
    return record;
  }

  async getRun(runId: string): Promise<RunRecord | null> {
    return this.runs.get(runId) ?? null;
  }

  async listRuns(scope?: ScopeRef): Promise<RunRecord[]> {
    const runs = Array.from(this.runs.values());
    const scopedRuns = scope
      ? runs.filter((record) => sameScope(record.scope, scope))
      : runs;

    return scopedRuns.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }
}

export class InMemoryTraceRepository implements TraceRepository {
  private readonly traces = new Map<string, TraceRecord[]>();

  async appendTrace(record: TraceRecord): Promise<TraceRecord> {
    const existing = this.traces.get(record.runId) ?? [];
    this.traces.set(record.runId, [...existing, record]);
    return record;
  }

  async listTraces(runId: string): Promise<TraceRecord[]> {
    return this.traces.get(runId) ?? [];
  }
}

export class InMemoryMemoryRepository implements MemoryRepository {
  private readonly records: MemoryRecord[] = [];

  async writeMemory(record: MemoryRecord): Promise<MemoryRecord> {
    this.records.push(record);
    return record;
  }

  async listMemory(scope: ScopeRef): Promise<MemoryRecord[]> {
    return this.records.filter((record) => sameScope(record.scope, scope));
  }
}

export class InMemoryArtifactRepository implements ArtifactRepository {
  private readonly records = new Map<string, ArtifactRecord>();

  async createArtifact(record: ArtifactRecord): Promise<ArtifactRecord> {
    this.records.set(record.artifactId, record);
    return record;
  }

  async getArtifact(artifactId: string): Promise<ArtifactRecord | null> {
    return this.records.get(artifactId) ?? null;
  }
}

export class InMemoryUsageLedger implements UsageLedger {
  private readonly records: UsageRecord[] = [];

  async recordUsage(record: UsageRecord): Promise<UsageRecord> {
    this.records.push(record);
    return record;
  }

  async listUsage(scope?: ScopeRef): Promise<UsageRecord[]> {
    if (!scope) {
      return [...this.records];
    }
    return this.records.filter((record) => sameScope(record.scope, scope));
  }
}

export function createInMemoryCoreRepositories() {
  return {
    accessGraphRepository: new InMemoryAccessGraphRepository(),
    manifestRegistry: new InMemoryManifestRegistry(),
    serviceCatalog: new InMemoryServiceCatalog(),
    bindingResolver: new InMemoryBindingResolver(),
    runRepository: new InMemoryRunRepository(),
    traceRepository: new InMemoryTraceRepository(),
    memoryRepository: new InMemoryMemoryRepository(),
    artifactRepository: new InMemoryArtifactRepository(),
    usageLedger: new InMemoryUsageLedger()
  };
}
