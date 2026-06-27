export type ScopeRef = {
  workspaceId: string;
  orgId?: string;
  groupId?: string;
  projectId?: string;
  appInstallationId?: string;
};

export type ResourceKind =
  | "pico.app"
  | "pico.service"
  | "pico.agent"
  | "pico.skill"
  | "pico.harness"
  | "pico.capability"
  | "pico.conversation"
  | "pico.eval"
  | "pico.binding"
  | "pico.policy";

export type ManifestBase = {
  kind: ResourceKind;
  version: number;
  id: string;
  name?: string;
};

export type VisibilityAccess = "private" | "internal" | "customers" | "public" | "inherited";

export type VisibilityRule = {
  access: VisibilityAccess;
  customers?: string[];
  groups?: string[];
};

export type AppViewDefinition = {
  resource: string;
  visibility?: VisibilityRule;
};

export type AppObjectDefinition = {
  schema: string;
  view?: string;
  views?: Record<string, string>;
  visibility?: VisibilityRule;
};

export type AppActionDefinition = {
  input?: string;
  output?: string;
  mutates?: string[];
  handler?: string;
  uses?: string;
  visibility?: VisibilityRule;
};

export type PicoAppManifest = ManifestBase & {
  kind: "pico.app";
  packageName?: string;
  publisher?: {
    workspaceId?: string;
    orgId?: string;
  };
  visibility?: VisibilityRule;
  objects?: Record<string, AppObjectDefinition>;
  actions?: Record<string, AppActionDefinition>;
  views?: Record<string, AppViewDefinition>;
  requires?: {
    services?: Record<string, string>;
  };
  donates?: {
    services?: string[];
    capabilities?: Array<{
      id: string;
      contract: string;
      harness?: string;
    }>;
  };
  agents?: string[];
  harnesses?: string[];
};

export type PicoServiceManifest = ManifestBase & {
  kind: "pico.service";
  packageName?: string;
  summary?: string;
  schema?: {
    input?: string;
    output?: string;
  };
  policy?: {
    visibility?: VisibilityAccess;
    requires?: string[];
    audit?: "required" | "optional";
  };
  uses?: {
    tools?: string[];
  };
  follows?: {
    skills?: string[];
  };
  records?: {
    emit?: string[];
  };
  "interface"?: {
    functions?: Array<{
      name: string;
      input?: string;
      output?: string;
    }>;
  };
  contract?: string;
  ownerAppId?: string;
  capabilities?: string[];
};

export type PicoAgentManifest = ManifestBase & {
  kind: "pico.agent";
  owner: {
    scope: "tenant" | "org" | "team" | "project";
    ref: string;
  };
  model: {
    contract: string;
    profile?: string;
  };
  prompt?: {
    file?: string;
    inline?: string;
  };
  skills?: string[];
  harness?: string;
  memory?: {
    scope: "tenant" | "org" | "team" | "project" | "conversation" | "run";
  };
  permissions?: {
    requestedCapabilities?: string[];
  };
};

export type PicoSkillManifest = ManifestBase & {
  kind: "pico.skill";
  description?: string;
  instructions?: string;
  harnessRequirements?: string[];
};

export type PicoHarnessManifest = ManifestBase & {
  kind: "pico.harness";
  runtime?: {
    type: string;
    timeoutSeconds?: number;
    concurrency?: number;
  };
  mounts?: {
    skills?: string[];
    capabilities?: string[];
  };
  context?: {
    sources?: string[];
  };
  permissions?: {
    dataScope?: "tenant" | "org" | "team" | "project";
  };
  observability?: {
    traces?: boolean;
    toolCalls?: boolean;
    costTracking?: boolean;
    runHistory?: boolean;
  };
  evals?: string[];
};

export type PicoCapabilityManifest = ManifestBase & {
  kind: "pico.capability";
  contract: string;
  ownerAppId: string;
  scopes?: string[];
};

export type PicoConversationManifest = ManifestBase & {
  kind: "pico.conversation";
  participants: Array<{
    type: "human" | "human_group" | "agent";
    ref: string;
  }>;
  turnPolicy?: {
    mode: "freeform" | "moderated";
    moderator?: string;
  };
};

export type PicoEvalManifest = ManifestBase & {
  kind: "pico.eval";
  target: {
    kind: "agent" | "harness" | "conversation" | "service";
    id: string;
  };
  requirements?: Array<{
    id: string;
    type: "assertion" | "evaluator" | "limit";
    minScore?: number;
    maxToolCalls?: number;
  }>;
};

export type PicoBindingManifest = ManifestBase & {
  kind: "pico.binding";
  environment: string;
  bindings: Record<
    string,
    {
      provider: string;
      model?: string;
      serviceId?: string;
      capabilityId?: string;
    }
  >;
};

export type PicoPolicyManifest = ManifestBase & {
  kind: "pico.policy";
  rules: Array<{
    actor: string;
    action: string;
    resource: string;
    effect: "allow" | "deny";
  }>;
};

export type ActorKind = "user" | "app" | "service" | "system";

export type ActorRecord = {
  actorId: string;
  workspaceId: string;
  kind: ActorKind;
  handle: string;
  displayName: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
};

export type GroupRecord = {
  groupId: string;
  workspaceId: string;
  slug: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
};

export type IdentityKind = "user" | "group";

export type IdentityRecord = {
  identityId: string;
  workspaceId: string;
  provider: string;
  externalId: string;
  kind: IdentityKind;
  mapsToType: "actor" | "group";
  mapsToId: string;
  createdAt: string;
  updatedAt: string;
};

export type GrantRecord = {
  grantId: string;
  workspaceId: string;
  granteeType: "actor" | "group";
  granteeId: string;
  relation: string;
  resourceType: string;
  resourceId: string;
  createdAt: string;
};

export type AuditEventRecord = {
  auditEventId: string;
  workspaceId?: string;
  actorId?: string;
  action: string;
  resource: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type PlatformManifest =
  | PicoAppManifest
  | PicoServiceManifest
  | PicoAgentManifest
  | PicoSkillManifest
  | PicoHarnessManifest
  | PicoCapabilityManifest
  | PicoConversationManifest
  | PicoEvalManifest
  | PicoBindingManifest
  | PicoPolicyManifest;

export type ManifestLifecycleState = "draft" | "active" | "deprecated" | "disabled";

export type ManifestRecord = {
  manifestId: string;
  resourceId: string;
  kind: ResourceKind;
  scope: ScopeRef;
  version: number;
  lifecycleState: ManifestLifecycleState;
  manifest: PlatformManifest;
  createdAt: string;
  updatedAt: string;
};

export type RunRecord = {
  runId: string;
  scope: ScopeRef;
  appId: string;
  actionId?: string;
  actorId?: string;
  servicePackageName?: string;
  serviceVersion?: number;
  policySnapshotId?: string;
  bindingSnapshotId?: string;
  schemaVersions?: Record<string, string>;
  agentId: string;
  harnessId: string;
  conversationId: string;
  status: "pending" | "running" | "succeeded" | "failed";
  startedAt: string;
  completedAt?: string;
  output?: string;
  error?: string;
};

export type TraceRecord = {
  traceId: string;
  runId: string;
  eventType: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type MemoryRecord = {
  memoryId: string;
  scope: ScopeRef;
  kind: string;
  content: string;
  sourceRunId?: string;
  createdAt: string;
};

export type ArtifactRecord = {
  artifactId: string;
  scope: ScopeRef;
  objectUri: string;
  contentType: string;
  sizeBytes: number;
  checksum?: string;
  createdAt: string;
};

export type ServiceRecord = {
  serviceId: string;
  manifest: PicoServiceManifest;
  lifecycleState: "draft" | "published" | "deprecated" | "disabled";
  createdAt: string;
  updatedAt: string;
};

export type BindingRecord = {
  bindingId: string;
  scope: ScopeRef;
  environment: string;
  requirement: string;
  provider: string;
  serviceId?: string;
  capabilityId?: string;
  model?: string;
  createdAt: string;
  updatedAt: string;
};

export type EvalResultRecord = {
  evalResultId: string;
  runId: string;
  evalId: string;
  passed: boolean;
  score?: number;
  summary?: string;
  createdAt: string;
};

export type UsageRecord = {
  usageId: string;
  scope: ScopeRef;
  runId?: string;
  provider?: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  costMicros?: number;
  currency?: string;
  createdAt: string;
};
