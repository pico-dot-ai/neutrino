import type {
  ArtifactRecord,
  BindingRecord,
  MemoryRecord,
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
