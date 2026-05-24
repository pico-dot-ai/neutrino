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
  UsageRecord,
  VectorMatch,
  VectorQuery
} from "@neutrino/schema";

export type GrantListFilter = {
  workspaceId?: string;
  granteeType?: "actor" | "group";
  granteeId?: string;
  relation?: string;
  resourceType?: string;
  resourceId?: string;
};

export interface AccessGraphRepository {
  upsertActor(record: ActorRecord): Promise<ActorRecord>;
  upsertGroup(record: GroupRecord): Promise<GroupRecord>;
  upsertIdentity(record: IdentityRecord): Promise<IdentityRecord>;
  addGrant(record: GrantRecord): Promise<GrantRecord>;
  listGrants(filter?: GrantListFilter): Promise<GrantRecord[]>;
}

export interface ServiceCatalog {
  registerService(manifest: PicoServiceManifest): Promise<ServiceRecord>;
  getService(serviceId: string): Promise<ServiceRecord | null>;
  listServices(scope?: ScopeRef): Promise<ServiceRecord[]>;
}

export type ResolvedBinding = {
  requirement: string;
  provider: string;
  serviceId?: string;
  capabilityId?: string;
  model?: string;
};

export interface BindingResolver {
  registerBinding(scope: ScopeRef, manifest: PicoBindingManifest): Promise<BindingRecord[]>;
  resolveBinding(options: {
    scope: ScopeRef;
    environment: string;
    requirement: string;
  }): Promise<ResolvedBinding | null>;
}

export interface ManifestRegistry {
  registerManifest(options: {
    scope: ScopeRef;
    manifest: PlatformManifest;
    lifecycleState?: ManifestLifecycleState;
  }): Promise<ManifestRecord>;
  listManifests(options?: {
    scope?: ScopeRef;
    kind?: PlatformManifest["kind"];
    resourceId?: string;
    lifecycleStates?: ManifestLifecycleState[];
  }): Promise<ManifestRecord[]>;
  resolveManifest(options: {
    scope: ScopeRef;
    kind: PlatformManifest["kind"];
    resourceId: string;
    version?: number;
    lifecycleStates?: ManifestLifecycleState[];
  }): Promise<ManifestRecord | null>;
}

export interface RunRepository {
  createRun(record: RunRecord): Promise<RunRecord>;
  updateRun(record: RunRecord): Promise<RunRecord>;
  getRun(runId: string): Promise<RunRecord | null>;
  listRuns(scope?: ScopeRef): Promise<RunRecord[]>;
}

export interface TraceRepository {
  appendTrace(record: TraceRecord): Promise<TraceRecord>;
  listTraces(runId: string): Promise<TraceRecord[]>;
}

export interface MemoryRepository {
  writeMemory(record: MemoryRecord): Promise<MemoryRecord>;
  listMemory(scope: ScopeRef): Promise<MemoryRecord[]>;
}

export interface MemoryIndex {
  indexMemory(record: MemoryRecord): Promise<void>;
  queryMemory(query: VectorQuery): Promise<VectorMatch[]>;
}

export interface ArtifactRepository {
  createArtifact(record: ArtifactRecord): Promise<ArtifactRecord>;
  getArtifact(artifactId: string): Promise<ArtifactRecord | null>;
}

export interface UsageLedger {
  recordUsage(record: UsageRecord): Promise<UsageRecord>;
  listUsage(scope?: ScopeRef): Promise<UsageRecord[]>;
}
