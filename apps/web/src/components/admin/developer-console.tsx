"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Blocks,
  Braces,
  Cable,
  Database,
  FileBox,
  History,
  LayoutDashboard,
  Menu,
  Play,
  RefreshCw,
  Send,
  Settings,
  Upload
} from "lucide-react";
import { Badge, Button, Input, Separator, Sheet, SheetContent, SheetOverlay, Textarea } from "@neutrino/ui";
import { FrostedHeader } from "@/components/design/frosted-header";

type ActorPayload = {
  actor: {
    actorId?: string;
    username: string;
    email: string;
    groups: string[];
  };
};

type ContextPayload = {
  scope: ManifestRecord["scope"];
  actor: {
    actorId: string | null;
    email: string;
  };
};

type OAuthAppRecord = {
  app_id: string;
  displayName: string;
  appType: "consumer" | "provider" | "both";
};

type CapabilityRecord = {
  capabilityId: string;
  name: string;
  version: string;
  ownerAppId: string;
  lifecycleState: string;
  internalOnly: boolean;
};

type RuntimeRunRecord = {
  run: {
    runId: string;
    status: string;
    appId: string;
    actionId?: string;
    actorId?: string;
    servicePackageName?: string;
    serviceVersion?: number;
    startedAt: string;
    completedAt?: string;
    output?: string;
    error?: string;
  };
  traces: Array<{
    traceId: string;
    eventType: string;
    message: string;
    createdAt: string;
  }>;
};

type UsageRecord = {
  usageId: string;
  runId: string;
  provider: string;
  model: string;
  createdAt: string;
};

type RuntimeListPayload = {
  runs: RuntimeRunRecord[];
  usage: UsageRecord[];
  memory: MemoryRecord[];
  artifacts: ArtifactRecord[];
};

type ManifestRecord = {
  manifestId: string;
  resourceId: string;
  kind: string;
  scope: {
    workspaceId: string;
    orgId?: string;
    groupId?: string;
    projectId?: string;
    appInstallationId?: string;
  };
  version: number;
  lifecycleState: string;
  manifest?: unknown;
};

type AppInventoryRecord = {
  id: string;
  packageName: string;
  name: string;
  version: number;
  visibility?: { access: string };
  objects: Array<{ objectId: string; schema: string; view?: string; visibility?: { access: string } }>;
  actions: Array<{
    actionId: string;
    input?: string;
    output?: string;
    uses?: string;
    visibility?: { access: string };
  }>;
  views: Array<{ viewId: string; resource: string; visibility?: { access: string } }>;
};

type ServiceInventoryRecord = {
  serviceId: string;
  manifest: {
    id: string;
    packageName?: string;
    name?: string;
    summary?: string;
    version: number;
  };
  lifecycleState: string;
};

type BindingInventoryRecord = {
  bindingId: string;
  manifestId: string;
  scope: ManifestRecord["scope"];
  environment: string;
  requirement: string;
  provider: string;
  model?: string;
  serviceId?: string;
  capabilityId?: string;
};

type MemoryRecord = {
  memoryId: string;
  kind: string;
  content: string;
  sourceRunId?: string;
  createdAt: string;
};

type ArtifactRecord = {
  artifactId: string;
  objectUri: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
};

type AuthUserRecord = {
  actor: {
    actorId: string;
    workspaceId: string;
    handle: string;
    displayName: string;
    email?: string;
  };
  identities: Array<{
    identityId: string;
    provider: string;
    externalId: string;
  }>;
  grants: Array<{
    grantId: string;
    relation: string;
    resourceType: string;
    resourceId: string;
  }>;
  audit: Array<{
    auditEventId: string;
    action: string;
    resource: string;
    createdAt: string;
    metadata?: Record<string, unknown>;
  }>;
  lifecycle: {
    hostedIdentityState: string;
    isManaged: boolean;
  };
};

type SectionId =
  | "overview"
  | "auth"
  | "apps"
  | "services"
  | "bindings"
  | "invoke"
  | "executions"
  | "memory-artifacts"
  | "manifests"
  | "integrations";

type SectionDef = {
  id: SectionId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const SECTIONS: SectionDef[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "auth", label: "Auth", icon: Settings },
  { id: "apps", label: "Apps", icon: Blocks },
  { id: "services", label: "Services", icon: Settings },
  { id: "bindings", label: "Bindings", icon: Cable },
  { id: "invoke", label: "Invoke", icon: Play },
  { id: "executions", label: "Executions", icon: History },
  { id: "memory-artifacts", label: "Memory & Artifacts", icon: Database },
  { id: "manifests", label: "Manifests", icon: Braces },
  { id: "integrations", label: "Integrations", icon: FileBox }
];

function resolveSection(value: string | null): SectionId {
  const maybe = (value ?? "").trim();
  return SECTIONS.some((section) => section.id === maybe) ? (maybe as SectionId) : "overview";
}

async function requestJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const payload = (await response.json().catch(() => null)) as
    | ({ error?: string } & T)
    | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? `Request failed for ${url}`);
  }

  return payload as T;
}

function scopeLabel(scope: ManifestRecord["scope"]) {
  return [
    `workspace:${scope.workspaceId}`,
    scope.orgId ? `org:${scope.orgId}` : null,
    scope.groupId ? `group:${scope.groupId}` : null,
    scope.projectId ? `project:${scope.projectId}` : null,
    scope.appInstallationId ? `installation:${scope.appInstallationId}` : null
  ]
    .filter(Boolean)
    .join(" · ");
}

const workspaceSurfaceClass = "min-w-0 rounded-lg border border-border/70 bg-white/78 shadow-[0_1px_0_rgba(15,23,42,0.03)]";
const workspacePanelClass = `${workspaceSurfaceClass} p-4 sm:p-5`;
const workspaceRowClass = "min-w-0 border-b border-border/70 px-4 py-3 text-sm last:border-b-0 sm:px-5";
const workspaceInputClass = "min-w-0";
const workspaceCodeClass = "mt-4 max-w-full overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs";

export function DeveloperConsole() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeSection = resolveSection(searchParams.get("section"));

  const [actor, setActor] = React.useState<ActorPayload["actor"] | null>(null);
  const [context, setContext] = React.useState<ContextPayload | null>(null);
  const [oauthApps, setOauthApps] = React.useState<OAuthAppRecord[]>([]);
  const [capabilities, setCapabilities] = React.useState<CapabilityRecord[]>([]);
  const [apps, setApps] = React.useState<AppInventoryRecord[]>([]);
  const [services, setServices] = React.useState<ServiceInventoryRecord[]>([]);
  const [bindings, setBindings] = React.useState<BindingInventoryRecord[]>([]);
  const [runtimeRuns, setRuntimeRuns] = React.useState<RuntimeRunRecord[]>([]);
  const [runtimeUsage, setRuntimeUsage] = React.useState<UsageRecord[]>([]);
  const [runtimeMemory, setRuntimeMemory] = React.useState<MemoryRecord[]>([]);
  const [runtimeArtifacts, setRuntimeArtifacts] = React.useState<ArtifactRecord[]>([]);
  const [manifestRecords, setManifestRecords] = React.useState<ManifestRecord[]>([]);
  const [authUsers, setAuthUsers] = React.useState<AuthUserRecord[]>([]);
  const [message, setMessage] = React.useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isInvoking, setIsInvoking] = React.useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = React.useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = React.useState<string | null>(null);

  const [displayName, setDisplayName] = React.useState("Sample Internal App");
  const [appType, setAppType] = React.useState<OAuthAppRecord["appType"]>("consumer");
  const [capabilityName, setCapabilityName] = React.useState("decision-tracker");
  const [capabilityVersion, setCapabilityVersion] = React.useState("0.1.0");
  const [ownerAppId, setOwnerPicoAppId] = React.useState("");
  const [invokePrompt, setInvokePrompt] = React.useState("Summarize what this app/action/service path proves.");

  const [manifestJson, setManifestJson] = React.useState("{}");
  const [bindingJson, setBindingJson] = React.useState("{}");

  const [appManifestForm, setAppManifestForm] = React.useState({
    id: "acme.support-desk",
    packageName: "@acme/support-desk",
    name: "Support Desk",
    visibility: "internal",
    objectId: "ticket",
    objectSchema: "./schemas/ticket.json",
    objectView: "ui://acme/support-desk/ticket",
    actionId: "summarize_ticket",
    actionInput: "./schemas/summarize-ticket.input.json",
    actionOutput: "./schemas/summarize-ticket.output.json",
    actionUses: "@pico/dev-agent-service@1.0.0",
    viewId: "ticket",
    viewResource: "ui://acme/support-desk/ticket"
  });

  const [serviceManifestForm, setServiceManifestForm] = React.useState({
    id: "acme.service.support-summary",
    packageName: "@acme/support-summary-service",
    name: "Support Summary Service",
    version: 1,
    summary: "Summarizes support tickets.",
    schemaInput: "./schemas/summarize-ticket.input.json",
    schemaOutput: "./schemas/summarize-ticket.output.json",
    policyVisibility: "internal"
  });

  const [bindingManifestForm, setBindingManifestForm] = React.useState({
    id: "acme.binding.support.local",
    environment: "local",
    requirement: "languageModel",
    provider: "openai",
    model: "gpt-5-mini",
    serviceId: "",
    capabilityId: ""
  });
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteUsername, setInviteUsername] = React.useState("");

  const appManifestPayload = React.useMemo(
    () => ({
      kind: "pico.app",
      version: 1,
      id: appManifestForm.id,
      packageName: appManifestForm.packageName,
      name: appManifestForm.name,
      visibility: { access: appManifestForm.visibility },
      objects: {
        [appManifestForm.objectId]: {
          schema: appManifestForm.objectSchema,
          view: appManifestForm.objectView,
          visibility: { access: "inherited" }
        }
      },
      actions: {
        [appManifestForm.actionId]: {
          input: appManifestForm.actionInput,
          output: appManifestForm.actionOutput,
          uses: appManifestForm.actionUses,
          visibility: { access: "inherited" }
        }
      },
      views: {
        [appManifestForm.viewId]: {
          resource: appManifestForm.viewResource,
          visibility: { access: "inherited" }
        }
      }
    }),
    [appManifestForm]
  );

  const serviceManifestPayload = React.useMemo(
    () => ({
      kind: "pico.service",
      version: serviceManifestForm.version,
      id: serviceManifestForm.id,
      packageName: serviceManifestForm.packageName,
      name: serviceManifestForm.name,
      summary: serviceManifestForm.summary,
      schema: {
        input: serviceManifestForm.schemaInput,
        output: serviceManifestForm.schemaOutput
      },
      policy: {
        visibility: serviceManifestForm.policyVisibility,
        requires: [],
        audit: "required"
      }
    }),
    [serviceManifestForm]
  );

  const bindingManifestPayload = React.useMemo(
    () => ({
      kind: "pico.binding",
      version: 1,
      id: bindingManifestForm.id,
      environment: bindingManifestForm.environment,
      bindings: {
        [bindingManifestForm.requirement]: {
          provider: bindingManifestForm.provider,
          ...(bindingManifestForm.model ? { model: bindingManifestForm.model } : {}),
          ...(bindingManifestForm.serviceId ? { serviceId: bindingManifestForm.serviceId } : {}),
          ...(bindingManifestForm.capabilityId
            ? { capabilityId: bindingManifestForm.capabilityId }
            : {})
        }
      }
    }),
    [bindingManifestForm]
  );

  React.useEffect(() => {
    setManifestJson(JSON.stringify(appManifestPayload, null, 2));
  }, [appManifestPayload]);

  React.useEffect(() => {
    setBindingJson(JSON.stringify(bindingManifestPayload, null, 2));
  }, [bindingManifestPayload]);

  const refresh = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [
        me,
        contextPayload,
        authPayload,
        appList,
        capabilityList,
        platformApps,
        platformServices,
        platformBindings,
        runtimeList,
        manifestList
      ] = await Promise.all([
        requestJson<ActorPayload>("/api/auth/me"),
        requestJson<ContextPayload>("/api/platform/context"),
        requestJson<{ users: AuthUserRecord[] }>("/api/platform/auth/users"),
        requestJson<{ apps: OAuthAppRecord[] }>("/api/platform/oauth-apps"),
        requestJson<{ capabilities: CapabilityRecord[] }>("/api/platform/capabilities"),
        requestJson<{ apps: AppInventoryRecord[] }>("/api/platform/apps"),
        requestJson<{ services: ServiceInventoryRecord[] }>("/api/platform/services"),
        requestJson<{ bindings: BindingInventoryRecord[] }>("/api/platform/bindings"),
        requestJson<RuntimeListPayload>("/api/platform/runtime/runs"),
        requestJson<{ manifests: ManifestRecord[] }>("/api/platform/manifests")
      ]);

      setActor(me.actor);
      setContext(contextPayload);
      setAuthUsers(authPayload.users ?? []);
      setOauthApps(appList.apps);
      setCapabilities(capabilityList.capabilities);
      setApps(platformApps.apps);
      setServices(platformServices.services);
      setBindings(platformBindings.bindings);
      setRuntimeRuns(runtimeList.runs);
      setRuntimeUsage(runtimeList.usage);
      setRuntimeMemory(runtimeList.memory ?? []);
      setRuntimeArtifacts(runtimeList.artifacts ?? []);
      setManifestRecords(manifestList.manifests ?? []);
      setLastRefreshedAt(new Date().toISOString());
      setOwnerPicoAppId((currentOwnerPicoAppId) =>
        currentOwnerPicoAppId || appList.apps[0]?.app_id || ""
      );
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Unable to load console.");
    });
  }, [refresh]);

  function modelForRun(runId: string) {
    return runtimeUsage.find((record) => record.runId === runId)?.model ?? "unknown";
  }

  function navigateToSection(section: SectionId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", section);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    setIsMobileNavOpen(false);
  }

  async function registerOAuthApp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    try {
      const payload = await requestJson<{
        app: OAuthAppRecord;
        clientSecret: string;
      }>("/api/platform/oauth-apps/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, appType, ownerOrgId: "picoai" })
      });
      setMessage(`Registered ${payload.app.app_id}. Client secret (shown once): ${payload.clientSecret}`);
      await refresh();
      setOwnerPicoAppId(payload.app.app_id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to register app.");
    }
  }

  async function registerCapability(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    try {
      const payload = await requestJson<{ capability: CapabilityRecord }>(
        "/api/platform/capabilities/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: capabilityName,
            version: capabilityVersion,
            ownerAppId
          })
        }
      );
      setMessage(`Registered capability ${payload.capability.capabilityId}.`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to register capability.");
    }
  }

  async function registerManifestFromPayload(manifest: unknown, label: string) {
    setMessage(null);
    const payload = await requestJson<{ manifest: ManifestRecord }>("/api/platform/manifests/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: context?.scope, manifest })
    });
    setMessage(`Registered ${label} ${payload.manifest.resourceId}.`);
    await refresh();
  }

  async function registerManifestFromJson(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await registerManifestFromPayload(JSON.parse(manifestJson) as unknown, "manifest");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to register manifest.");
    }
  }

  async function registerAppManifest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await registerManifestFromPayload(appManifestPayload, "app manifest");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to register app manifest.");
    }
  }

  async function registerServiceManifest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await registerManifestFromPayload(serviceManifestPayload, "service manifest");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to register service manifest.");
    }
  }

  async function registerBinding(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    try {
      const payload = await requestJson<{ bindings: BindingInventoryRecord[] }>(
        "/api/platform/bindings/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scope: context?.scope,
            manifest: bindingManifestPayload
          })
        }
      );
      setMessage(`Registered ${payload.bindings.length} binding records.`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to register binding.");
    }
  }

  async function registerBindingFromJson(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    try {
      const payload = await requestJson<{ bindings: BindingInventoryRecord[] }>(
        "/api/platform/bindings/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scope: context?.scope,
            manifest: JSON.parse(bindingJson) as unknown
          })
        }
      );
      setMessage(`Registered ${payload.bindings.length} binding records.`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to register binding.");
    }
  }

  async function invokeDevAgentAction() {
    setMessage(null);
    setIsInvoking(true);
    try {
      const payload = await requestJson<{ run: RuntimeRunRecord["run"] }>(
        "/api/apps/pico.dev-agent/actions/generate_reply/invoke",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scope: context?.scope,
            messages: [{ role: "user", content: invokePrompt }]
          })
        }
      );
      setMessage(`Invocation ${payload.run.runId} finished with ${payload.run.status}.`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to invoke action.");
    } finally {
      setIsInvoking(false);
    }
  }

  async function logout() {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    const logoutUrl = response.headers.get("x-neutrino-logout-url");
    if (logoutUrl) {
      window.location.assign(logoutUrl);
      return;
    }
    router.push("/login");
  }

  async function inviteAuthUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    try {
      const payload = await requestJson<{ user: AuthUserRecord }>("/api/platform/auth/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          ...(inviteUsername ? { username: inviteUsername } : {})
        })
      });
      setMessage(`Invited ${payload.user.actor.email ?? payload.user.actor.actorId}.`);
      setInviteEmail("");
      setInviteUsername("");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to invite user.");
    }
  }

  async function postAuthUserAction(actorId: string, suffix: "disable" | "reactivate" | "password-reset") {
    setMessage(null);
    try {
      await requestJson(`/api/platform/auth/users/${encodeURIComponent(actorId)}/${suffix}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      setMessage(
        suffix === "password-reset"
          ? "Password reset initiated."
          : `${suffix === "disable" ? "Disabled" : "Reactivated"} ${actorId}.`
      );
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update user.");
    }
  }

  const lastRun = runtimeRuns[0]?.run;
  const activeSectionDef = SECTIONS.find((section) => section.id === activeSection) ?? SECTIONS[0];

  function renderOverview() {
    return (
      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,0.72fr)_minmax(320px,0.28fr)]">
        <div className={workspaceSurfaceClass}>
          <div className="border-b border-border/70 px-4 py-4 sm:px-5">
            <h2 className="text-base font-semibold">Latest run</h2>
          </div>
          {lastRun ? (
            <article className="px-4 py-4 text-sm sm:px-5">
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="break-all font-medium">{lastRun.runId}</p>
                  <p className="mt-1 text-muted-foreground">
                    {lastRun.actionId ?? "unknown action"} · {modelForRun(lastRun.runId)}
                  </p>
                </div>
                <Badge className="w-fit border-border bg-white text-foreground">{lastRun.status}</Badge>
              </div>
              {lastRun.output || lastRun.error ? (
                <p className="mt-4 max-w-3xl whitespace-pre-wrap break-words text-muted-foreground">
                  {lastRun.output ?? lastRun.error}
                </p>
              ) : null}
            </article>
          ) : (
            <p className="px-4 py-4 text-sm text-muted-foreground sm:px-5">No runs yet.</p>
          )}
        </div>
        <div className={workspaceSurfaceClass}>
          {[
            ["Apps", apps.length],
            ["Services", services.length],
            ["Bindings", bindings.length],
            ["Executions", runtimeRuns.length]
          ].map(([label, value]) => (
            <div className="flex items-center justify-between border-b border-border/70 px-4 py-3 last:border-b-0 sm:px-5" key={label}>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="text-lg font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  function renderApps() {
    return (
      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.42fr)]">
        <div className={workspaceSurfaceClass}>
          <div className="border-b border-border/70 px-4 py-4 sm:px-5">
            <h2 className="text-base font-semibold">App inventory</h2>
          </div>
          <div>
            {apps.map((app) => (
              <article className={workspaceRowClass} key={app.id}>
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words font-medium">{app.name}</p>
                    <p className="mt-1 break-all text-muted-foreground">
                      {app.packageName} · v{app.version}
                    </p>
                  </div>
                  <Badge className="border-border bg-white text-foreground">
                    {app.visibility?.access ?? "private"}
                  </Badge>
                </div>
                <p className="mt-2 text-muted-foreground">
                  {app.objects.length} objects · {app.actions.length} actions · {app.views.length} views
                </p>
              </article>
            ))}
          </div>
        </div>
        <form className={workspacePanelClass} onSubmit={registerAppManifest}>
          <h2 className="text-base font-semibold">App manifest builder</h2>
          <Separator className="my-4" />
          <div className="grid gap-3">
            <Input
              aria-label="App ID"
              onChange={(event) => setAppManifestForm((s) => ({ ...s, id: event.target.value }))}
              className={workspaceInputClass}
              placeholder="App ID"
              value={appManifestForm.id}
            />
            <Input
              aria-label="Package Name"
              onChange={(event) =>
                setAppManifestForm((s) => ({ ...s, packageName: event.target.value }))
              }
              className={workspaceInputClass}
              placeholder="Package Name"
              value={appManifestForm.packageName}
            />
            <Input
              aria-label="Display Name"
              onChange={(event) => setAppManifestForm((s) => ({ ...s, name: event.target.value }))}
              className={workspaceInputClass}
              placeholder="Display Name"
              value={appManifestForm.name}
            />
            <Input
              aria-label="Action ID"
              onChange={(event) =>
                setAppManifestForm((s) => ({ ...s, actionId: event.target.value }))
              }
              className={workspaceInputClass}
              placeholder="Action ID"
              value={appManifestForm.actionId}
            />
            <Input
              aria-label="Action Uses"
              onChange={(event) =>
                setAppManifestForm((s) => ({ ...s, actionUses: event.target.value }))
              }
              className={workspaceInputClass}
              placeholder="Action service reference"
              value={appManifestForm.actionUses}
            />
          </div>
          <Textarea className={`${workspaceCodeClass} min-h-52`} readOnly value={JSON.stringify(appManifestPayload, null, 2)} />
          <Button className="mt-4" type="submit">
            <Upload className="mr-2 h-4 w-4" />
            Register App Manifest
          </Button>
        </form>
      </section>
    );
  }

  function renderAuth() {
    return (
      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.42fr)]">
        <div className={workspaceSurfaceClass}>
          <div className="border-b border-border/70 px-4 py-4 sm:px-5">
            <h2 className="text-base font-semibold">Hosted-auth users</h2>
          </div>
          <div>
            {authUsers.map((user) => (
              <article className={workspaceRowClass} key={user.actor.actorId}>
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words font-medium">
                      {user.actor.displayName || user.actor.handle}
                    </p>
                    <p className="mt-1 break-all text-muted-foreground">
                      {user.actor.email ?? user.actor.actorId}
                    </p>
                    <p className="mt-1 break-words text-muted-foreground">
                      {user.identities.map((identity) => `${identity.provider}:${identity.externalId}`).join(" · ") || "No hosted identity"}
                    </p>
                    <p className="mt-1 break-words text-muted-foreground">
                      {user.grants.map((grant) => `${grant.relation} ${grant.resourceType}`).join(" · ") || "No grants"}
                    </p>
                  </div>
                  <Badge className="w-fit border-border bg-white text-foreground">
                    {user.lifecycle.hostedIdentityState}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    onClick={() => void postAuthUserAction(user.actor.actorId, "password-reset")}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    Reset Password
                  </Button>
                  <Button
                    onClick={() => void postAuthUserAction(user.actor.actorId, "disable")}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    Disable
                  </Button>
                  <Button
                    onClick={() => void postAuthUserAction(user.actor.actorId, "reactivate")}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    Reactivate
                  </Button>
                </div>
                {user.audit.length > 0 ? (
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {user.audit.slice(-3).reverse().map((event) => (
                      <p key={event.auditEventId}>
                        {event.action} · {new Date(event.createdAt).toLocaleString()}
                      </p>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </div>
        <form className={workspacePanelClass} onSubmit={inviteAuthUser}>
          <h2 className="text-base font-semibold">Invite managed user</h2>
          <Separator className="my-4" />
          <div className="grid gap-3">
            <Input
              aria-label="Invite email"
              className={workspaceInputClass}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="user@company.com"
              value={inviteEmail}
            />
            <Input
              aria-label="Invite username"
              className={workspaceInputClass}
              onChange={(event) => setInviteUsername(event.target.value)}
              placeholder="username"
              value={inviteUsername}
            />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Invite creates a hosted identity, durable actor mapping, default grant, and password recovery path without exposing tokens in the UI.
          </p>
          <Button className="mt-4" type="submit">
            <Send className="mr-2 h-4 w-4" />
            Invite User
          </Button>
        </form>
      </section>
    );
  }

  function renderServices() {
    return (
      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.42fr)]">
        <div className={workspaceSurfaceClass}>
          <div className="border-b border-border/70 px-4 py-4 sm:px-5">
            <h2 className="text-base font-semibold">Service inventory</h2>
          </div>
          <div>
            {services.map((service) => (
              <article className={workspaceRowClass} key={service.serviceId}>
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words font-medium">{service.manifest.name ?? service.manifest.id}</p>
                    <p className="mt-1 break-all text-muted-foreground">
                  {service.manifest.packageName ?? service.serviceId} · v{service.manifest.version}
                </p>
                  </div>
                  <Badge className="w-fit border-border bg-white text-foreground">{service.lifecycleState}</Badge>
                </div>
              </article>
            ))}
          </div>
        </div>
        <form className={workspacePanelClass} onSubmit={registerServiceManifest}>
          <h2 className="text-base font-semibold">Service manifest builder</h2>
          <Separator className="my-4" />
          <div className="grid gap-3">
            <Input
              aria-label="Service ID"
              onChange={(event) =>
                setServiceManifestForm((s) => ({ ...s, id: event.target.value }))
              }
              className={workspaceInputClass}
              placeholder="Service ID"
              value={serviceManifestForm.id}
            />
            <Input
              aria-label="Service Package Name"
              onChange={(event) =>
                setServiceManifestForm((s) => ({ ...s, packageName: event.target.value }))
              }
              className={workspaceInputClass}
              placeholder="Package Name"
              value={serviceManifestForm.packageName}
            />
            <Input
              aria-label="Service Name"
              onChange={(event) =>
                setServiceManifestForm((s) => ({ ...s, name: event.target.value }))
              }
              className={workspaceInputClass}
              placeholder="Name"
              value={serviceManifestForm.name}
            />
            <Textarea
              aria-label="Service Summary"
              className="min-h-20"
              onChange={(event) =>
                setServiceManifestForm((s) => ({ ...s, summary: event.target.value }))
              }
              placeholder="Summary"
              value={serviceManifestForm.summary}
            />
          </div>
          <Textarea
            className={`${workspaceCodeClass} min-h-52`}
            readOnly
            value={JSON.stringify(serviceManifestPayload, null, 2)}
          />
          <Button className="mt-4" type="submit">
            <Upload className="mr-2 h-4 w-4" />
            Register Service Manifest
          </Button>
        </form>
      </section>
    );
  }

  function renderBindings() {
    return (
      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.42fr)]">
        <div className={workspaceSurfaceClass}>
          <div className="border-b border-border/70 px-4 py-4 sm:px-5">
            <h2 className="text-base font-semibold">Binding inventory</h2>
          </div>
          <div>
            {bindings.map((binding) => (
              <article className={workspaceRowClass} key={binding.bindingId}>
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words font-medium">{binding.requirement}</p>
                    <p className="mt-1 break-words text-muted-foreground">
                      {binding.environment} · {binding.provider}
                      {binding.model ? ` · ${binding.model}` : ""}
                    </p>
                    <p className="mt-1 break-words text-muted-foreground">{scopeLabel(binding.scope)}</p>
                  </div>
                  <Badge className="w-fit border-border bg-white text-foreground">{binding.provider}</Badge>
                </div>
              </article>
            ))}
          </div>
        </div>
        <div className="grid min-w-0 gap-5">
          <form className={workspacePanelClass} onSubmit={registerBinding}>
            <h2 className="text-base font-semibold">Binding manifest builder</h2>
            <Separator className="my-4" />
            <div className="grid gap-3">
              <Input
                aria-label="Binding ID"
                onChange={(event) =>
                  setBindingManifestForm((s) => ({ ...s, id: event.target.value }))
                }
                className={workspaceInputClass}
                placeholder="Binding ID"
                value={bindingManifestForm.id}
              />
              <Input
                aria-label="Binding Environment"
                onChange={(event) =>
                  setBindingManifestForm((s) => ({ ...s, environment: event.target.value }))
                }
                className={workspaceInputClass}
                placeholder="Environment"
                value={bindingManifestForm.environment}
              />
              <Input
                aria-label="Binding Requirement"
                onChange={(event) =>
                  setBindingManifestForm((s) => ({ ...s, requirement: event.target.value }))
                }
                className={workspaceInputClass}
                placeholder="Requirement"
                value={bindingManifestForm.requirement}
              />
              <Input
                aria-label="Binding Provider"
                onChange={(event) =>
                  setBindingManifestForm((s) => ({ ...s, provider: event.target.value }))
                }
                className={workspaceInputClass}
                placeholder="Provider"
                value={bindingManifestForm.provider}
              />
              <Input
                aria-label="Binding Model"
                onChange={(event) =>
                  setBindingManifestForm((s) => ({ ...s, model: event.target.value }))
                }
                className={workspaceInputClass}
                placeholder="Model (optional)"
                value={bindingManifestForm.model}
              />
            </div>
            <Textarea
              className={`${workspaceCodeClass} min-h-52`}
              readOnly
              value={JSON.stringify(bindingManifestPayload, null, 2)}
            />
            <Button className="mt-4" type="submit">
              <Upload className="mr-2 h-4 w-4" />
              Register Binding
            </Button>
          </form>
          <form className={workspacePanelClass} onSubmit={registerBindingFromJson}>
            <h2 className="text-base font-semibold">Raw binding JSON (escape hatch)</h2>
            <Separator className="my-4" />
            <Textarea
              className={`${workspaceCodeClass} min-h-52`}
              onChange={(event) => setBindingJson(event.target.value)}
              value={bindingJson}
            />
            <Button className="mt-4" type="submit" variant="secondary">
              <Upload className="mr-2 h-4 w-4" />
              Register Raw Binding
            </Button>
          </form>
        </div>
      </section>
    );
  }

  function renderInvoke() {
    return (
      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.36fr)]">
        <div className={workspacePanelClass}>
          <h2 className="text-base font-semibold">Invoke Dev Agent action</h2>
          <Separator className="my-4" />
          <Textarea
            className="min-h-56 max-w-full resize-y whitespace-pre-wrap break-words"
            onChange={(event) => setInvokePrompt(event.target.value)}
            value={invokePrompt}
          />
          <Button className="mt-4" disabled={isInvoking} onClick={() => void invokeDevAgentAction()} type="button">
            <Play className="mr-2 h-4 w-4" />
            {isInvoking ? "Invoking" : "Invoke"}
          </Button>
        </div>
        <div className={workspaceSurfaceClass}>
          <div className="border-b border-border/70 px-4 py-4 sm:px-5">
          <h2 className="text-base font-semibold">Latest invocation</h2>
          </div>
          {lastRun ? (
            <div className="space-y-2 px-4 py-4 text-sm sm:px-5">
              <p className="break-all font-medium">{lastRun.runId}</p>
              <p className="text-muted-foreground">status: {lastRun.status}</p>
              <p className="break-words text-muted-foreground">action: {lastRun.actionId ?? "unknown"}</p>
              <p className="text-muted-foreground">model: {modelForRun(lastRun.runId)}</p>
              <p className="whitespace-pre-wrap break-words text-muted-foreground">{lastRun.output ?? lastRun.error ?? ""}</p>
            </div>
          ) : (
            <p className="px-4 py-4 text-sm text-muted-foreground sm:px-5">No invocation yet.</p>
          )}
        </div>
      </section>
    );
  }

  function renderExecutions() {
    return (
      <section className={workspaceSurfaceClass}>
        <div className="border-b border-border/70 px-4 py-4 sm:px-5">
          <h2 className="text-base font-semibold">Execution history</h2>
        </div>
        <div>
          {runtimeRuns.map(({ run, traces }) => (
            <article className={workspaceRowClass} key={run.runId}>
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="break-all font-medium">{run.runId}</p>
                <Badge className="border-border bg-white text-foreground">{run.status}</Badge>
              </div>
              <p className="mt-1 break-words text-muted-foreground">
                {run.actionId ?? "unknown action"} · {run.servicePackageName ?? "service"} · model{" "}
                {modelForRun(run.runId)}
              </p>
              <p className="text-muted-foreground">{traces.length} traces</p>
              {run.output ? <p className="mt-2 whitespace-pre-wrap break-words text-muted-foreground">{run.output}</p> : null}
              {run.error ? <p className="mt-2 whitespace-pre-wrap break-words text-red-600">{run.error}</p> : null}
            </article>
          ))}
        </div>
      </section>
    );
  }

  function renderMemoryArtifacts() {
    return (
      <section className="grid min-w-0 gap-6 xl:grid-cols-2">
        <div className={workspaceSurfaceClass}>
          <div className="border-b border-border/70 px-4 py-4 sm:px-5">
            <h2 className="text-base font-semibold">Memory</h2>
          </div>
          <div>
            {runtimeMemory.map((memory) => (
              <article className={workspaceRowClass} key={memory.memoryId}>
                <p className="break-words font-medium">{memory.kind}</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">{memory.content}</p>
              </article>
            ))}
          </div>
        </div>
        <div className={workspaceSurfaceClass}>
          <div className="border-b border-border/70 px-4 py-4 sm:px-5">
            <h2 className="text-base font-semibold">Artifacts</h2>
          </div>
          <div>
            {runtimeArtifacts.map((artifact) => (
              <article className={workspaceRowClass} key={artifact.artifactId}>
                <p className="break-all font-medium" title={artifact.objectUri}>
                  {artifact.objectUri}
                </p>
                <p className="mt-1 break-words text-muted-foreground">
                  {artifact.contentType} · {artifact.sizeBytes} bytes
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  function renderManifests() {
    return (
      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.42fr)]">
        <div className={workspaceSurfaceClass}>
          <div className="border-b border-border/70 px-4 py-4 sm:px-5">
            <h2 className="text-base font-semibold">Manifest registry</h2>
          </div>
          <div>
            {manifestRecords.map((record) => (
              <article className={workspaceRowClass} key={record.manifestId}>
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words font-medium">{record.kind}</p>
                    <p className="mt-1 break-all text-muted-foreground">
                      id: {record.resourceId} · version: {record.version}
                    </p>
                    <p className="mt-1 break-words text-muted-foreground">{scopeLabel(record.scope)}</p>
                  </div>
                  <Badge className="w-fit border-border bg-white text-foreground">{record.lifecycleState}</Badge>
                </div>
              </article>
            ))}
          </div>
        </div>
        <form className={workspacePanelClass} onSubmit={registerManifestFromJson}>
          <h2 className="text-base font-semibold">Raw manifest JSON (escape hatch)</h2>
          <Separator className="my-4" />
          <Textarea
            className={`${workspaceCodeClass} min-h-80`}
            onChange={(event) => setManifestJson(event.target.value)}
            value={manifestJson}
          />
          <Button className="mt-4" type="submit">
            <Upload className="mr-2 h-4 w-4" />
            Register Raw Manifest
          </Button>
        </form>
      </section>
    );
  }

  function renderIntegrations() {
    return (
      <section className="grid min-w-0 gap-6 xl:grid-cols-2">
        <form className={workspacePanelClass} onSubmit={registerOAuthApp}>
          <h2 className="text-base font-semibold">OAuth app registration</h2>
          <Separator className="my-4" />
          <div className="space-y-3">
            <Input className={workspaceInputClass} onChange={(event) => setDisplayName(event.target.value)} value={displayName} />
            <select
              className="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm"
              onChange={(event) => setAppType(event.target.value as OAuthAppRecord["appType"])}
              value={appType}
            >
              <option value="consumer">consumer</option>
              <option value="provider">provider</option>
              <option value="both">both</option>
            </select>
          </div>
          <Button className="mt-4" type="submit">
            Register OAuth App
          </Button>
        </form>
        <form className={workspacePanelClass} onSubmit={registerCapability}>
          <h2 className="text-base font-semibold">Capability registration</h2>
          <Separator className="my-4" />
          <div className="space-y-3">
            <Input className={workspaceInputClass} onChange={(event) => setCapabilityName(event.target.value)} value={capabilityName} />
            <Input
              className={workspaceInputClass}
              onChange={(event) => setCapabilityVersion(event.target.value)}
              value={capabilityVersion}
            />
            <select
              className="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm"
              onChange={(event) => setOwnerPicoAppId(event.target.value)}
              value={ownerAppId}
            >
              <option value="">Select owner app</option>
              {oauthApps.map((app) => (
                <option key={app.app_id} value={app.app_id}>
                  {app.displayName} ({app.app_id})
                </option>
              ))}
            </select>
          </div>
          <Button className="mt-4" type="submit">
            Register Capability
          </Button>
        </form>
      </section>
    );
  }

  function renderActiveSection() {
    switch (activeSection) {
      case "overview":
        return renderOverview();
      case "auth":
        return renderAuth();
      case "apps":
        return renderApps();
      case "services":
        return renderServices();
      case "bindings":
        return renderBindings();
      case "invoke":
        return renderInvoke();
      case "executions":
        return renderExecutions();
      case "memory-artifacts":
        return renderMemoryArtifacts();
      case "manifests":
        return renderManifests();
      case "integrations":
        return renderIntegrations();
      default:
        return renderOverview();
    }
  }

  function renderControlPane() {
    return (
      <>
        <div className="min-w-0 px-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Neutrino</p>
          <h1 className="mt-1 truncate text-xl font-semibold tracking-normal">Control Plane</h1>
          <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
            {context ? scopeLabel(context.scope) : "Loading workspace context"}
          </p>
        </div>
        <div className="mt-4 px-2">
          <Badge className="max-w-full truncate border-border bg-white/80 text-foreground">
            {actor?.email ?? context?.actor.email ?? "..."}
          </Badge>
        </div>
        <Separator className="my-4" />
        <nav aria-label="Control plane sections" className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const active = activeSection === section.id;
            return (
              <Button
                className="h-9 w-full justify-start rounded-lg px-3"
                key={section.id}
                onClick={() => navigateToSection(section.id)}
                size="sm"
                type="button"
                variant={active ? "secondary" : "ghost"}
              >
                <Icon className="mr-2 h-4 w-4 shrink-0" />
                <span className="truncate">{section.label}</span>
              </Button>
            );
          })}
        </nav>
        {lastRefreshedAt ? (
          <p className="mt-4 border-t border-border/70 px-2 pt-4 text-xs text-muted-foreground">
            Last refreshed {new Date(lastRefreshedAt).toLocaleString()}
          </p>
        ) : null}
      </>
    );
  }

  return (
    <main className="h-screen overflow-hidden bg-[#f6f7f9] text-foreground">
      <div className="flex h-screen w-full min-w-0 overflow-hidden">
        <aside className="hidden h-screen w-[272px] shrink-0 flex-col border-r border-border/70 bg-[#fbfbfc]/90 px-3 py-4 md:flex xl:w-[288px]">
          {renderControlPane()}
        </aside>
        <section className="relative flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
          <FrostedHeader
            brand={{
              href: "/admin",
              ariaLabel: "Go to control plane overview",
              logoSrc: "/favicon.svg",
              logoWidth: 28,
              logoHeight: 28,
              title: activeSectionDef.label,
              subtitle: context ? scopeLabel(context.scope) : "Loading workspace context"
            }}
            classNames={{
              header:
                "absolute inset-x-0 top-0 z-20 border-b border-border/70 bg-[linear-gradient(to_top,rgba(247,247,249,0.08)_0%,rgba(247,247,249,0.3)_48%,rgba(247,247,249,0.58)_72%,rgba(247,247,249,0.88)_100%)] pt-[env(safe-area-inset-top,0)] backdrop-blur-[6px] [backdrop-filter:saturate(130%)_blur(6px)] [-webkit-backdrop-filter:saturate(130%)_blur(6px)]",
              inner:
                "flex w-full min-w-0 items-center justify-between gap-2 px-3 py-3 sm:px-5 lg:px-6",
              brand: "flex min-w-0 items-center gap-2",
              brandMark: "grid h-11 w-11 shrink-0 place-items-center",
              brandLogo: "block h-7 w-7",
              brandCopy: "min-w-0",
              brandTitle: "truncate text-base font-semibold leading-tight tracking-normal",
              brandSubtitle: "truncate text-xs leading-tight text-muted-foreground",
              nav: "flex shrink-0 items-center justify-end gap-2"
            }}
            navLabel="Workspace actions"
          >
            <Button
              aria-label="Open control plane sections"
              className="px-3 md:hidden"
              onClick={() => setIsMobileNavOpen(true)}
              size="sm"
              type="button"
              variant="secondary"
            >
              <Menu className="mr-2 h-4 w-4" />
              Sections
            </Button>
            <Button className="px-3" onClick={() => void refresh()} size="sm" type="button" variant="secondary">
              <RefreshCw className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{isRefreshing ? "Refreshing" : "Refresh"}</span>
            </Button>
            <Link href="/admin/debug/chat">
              <Button className="px-3" size="sm" type="button" variant="ghost">
                <Send className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Debug Chat</span>
              </Button>
            </Link>
            <Button className="px-3" onClick={() => void logout()} size="sm" type="button" variant="ghost">
              <span className="hidden sm:inline">Logout</span>
              <span className="sm:hidden">Exit</span>
            </Button>
          </FrostedHeader>
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4 pt-24 sm:px-5 md:px-6">
            {message ? <p className="mb-4 rounded-lg border border-border/70 bg-white/80 px-4 py-3 text-sm">{message}</p> : null}
            {renderActiveSection()}
          </div>
        </section>
      </div>
      <Sheet onOpenChange={setIsMobileNavOpen} open={isMobileNavOpen}>
        <SheetOverlay className="md:hidden" />
        <SheetContent
          aria-label="Control plane navigation"
          className="bg-[#fbfbfc] px-3 py-4 md:hidden"
          side="left"
        >
          {renderControlPane()}
        </SheetContent>
      </Sheet>
    </main>
  );
}
