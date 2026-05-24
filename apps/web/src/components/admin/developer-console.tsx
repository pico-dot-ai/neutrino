"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Boxes, Braces, Cable, History, Play, RefreshCw, Send, Settings, Upload } from "lucide-react";
import { Badge, Button, Input, Separator, Textarea } from "@neutrino/ui";

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
  status: string;
  productionApproved: boolean;
  clientId: string;
  assignedAdminEmails: string[];
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
    agentId: string;
    harnessId: string;
    conversationId: string;
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
  actions: Array<{ actionId: string; input?: string; output?: string; uses?: string; visibility?: { access: string } }>;
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

export function DeveloperConsole() {
  const router = useRouter();
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
  const [message, setMessage] = React.useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isInvoking, setIsInvoking] = React.useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = React.useState<string | null>(null);
  const [displayName, setDisplayName] = React.useState("Sample Internal App");
  const [appType, setAppType] = React.useState<OAuthAppRecord["appType"]>("consumer");
  const [capabilityName, setCapabilityName] = React.useState("decision-tracker");
  const [capabilityVersion, setCapabilityVersion] = React.useState("0.1.0");
  const [ownerAppId, setOwnerPicoAppId] = React.useState("");
  const [manifestJson, setManifestJson] = React.useState(
    JSON.stringify(
      {
        kind: "pico.app",
        version: 1,
        id: "acme.support-desk",
        packageName: "@acme/support-desk",
        name: "Support Desk",
        visibility: { access: "internal" },
        objects: {
          ticket: {
            schema: "./schemas/ticket.json",
            view: "ui://acme/support-desk/ticket",
            visibility: { access: "inherited" }
          }
        },
        actions: {
          summarize_ticket: {
            input: "./schemas/summarize-ticket.input.json",
            output: "./schemas/summarize-ticket.output.json",
            uses: "@pico/dev-agent-service@1.0.0",
            visibility: { access: "inherited" }
          }
        },
        views: {
          ticket: {
            resource: "ui://acme/support-desk/ticket",
            visibility: { access: "inherited" }
          }
        },
        agents: ["pico.dev-agent.agent"],
        harnesses: ["pico.dev-agent.harness"]
      },
      null,
      2
    )
  );
  const [bindingJson, setBindingJson] = React.useState(
    JSON.stringify(
      {
        kind: "pico.binding",
        version: 1,
        id: "pico.binding.dev-agent.local",
        name: "Dev agent local bindings",
        environment: "local",
        bindings: {
          languageModel: {
            provider: "openai",
            model: "gpt-5.2"
          },
          devAgentService: {
            provider: "core",
            serviceId: "pico.service.dev-agent",
            capabilityId: "pico.capability.dev-agent.generate"
          }
        }
      },
      null,
      2
    )
  );
  const [invokePrompt, setInvokePrompt] = React.useState("Summarize what this app/action/service path proves.");

  const refresh = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [
        me,
        contextPayload,
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

  async function registerOAuthApp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    try {
      const payload = await requestJson<{
        app: OAuthAppRecord;
        clientSecret: string;
      }>("/api/platform/oauth-apps/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          displayName,
          appType,
          ownerOrgId: "picoai"
        })
      });

      setMessage(
        `Registered ${payload.app.app_id}. Client secret (shown once): ${payload.clientSecret}`
      );
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
          headers: {
            "Content-Type": "application/json"
          },
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
      setMessage(
        error instanceof Error ? error.message : "Unable to register capability."
      );
    }
  }

  async function registerManifest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    try {
      const payload = await requestJson<{ manifest: ManifestRecord }>(
        "/api/platform/manifests/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            scope: context?.scope,
            manifest: JSON.parse(manifestJson) as unknown
          })
        }
      );

      setMessage(`Registered manifest ${payload.manifest.resourceId}.`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to register manifest.");
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
          headers: {
            "Content-Type": "application/json"
          },
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
          headers: {
            "Content-Type": "application/json"
          },
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
    await fetch("/api/auth/logout", {
      method: "POST"
    });
    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-[#f6f7f9] px-5 py-6 text-foreground sm:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-5">
        <header className="border-b border-border pb-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Neutrino</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">Control Plane</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {context ? scopeLabel(context.scope) : "Loading workspace context"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-border bg-white text-foreground">
                {actor?.email ?? context?.actor.email ?? "..."}
              </Badge>
              <Button onClick={() => void refresh()} size="sm" type="button" variant="secondary">
                <RefreshCw className="mr-2 h-4 w-4" />
                {isRefreshing ? "Refreshing" : "Refresh"}
              </Button>
              <Link href="/admin/debug/chat">
                <Button size="sm" type="button" variant="ghost">
                  <Send className="mr-2 h-4 w-4" />
                  Debug Chat
                </Button>
              </Link>
              <Button onClick={() => void logout()} size="sm" type="button" variant="ghost">
                Logout
              </Button>
            </div>
          </div>
          {lastRefreshedAt ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Last refreshed {new Date(lastRefreshedAt).toLocaleString()}
            </p>
          ) : null}
        </header>

        {message ? (
          <p className="border border-border bg-white px-4 py-3 text-sm">{message}</p>
        ) : null}

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
          <div className="border border-border bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center text-base font-semibold">
                <Boxes className="mr-2 h-4 w-4" />
                Apps
              </h2>
              <Badge className="border-border bg-background text-foreground">{apps.length}</Badge>
            </div>
            <Separator className="my-4" />
            <div className="grid gap-3">
              {apps.map((app) => (
                <article className="border border-border bg-background p-4" key={app.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{app.name}</p>
                      <p className="text-sm text-muted-foreground">{app.packageName} · v{app.version}</p>
                    </div>
                    <Badge className="border-border bg-white text-foreground">
                      {app.visibility?.access ?? "private"}
                    </Badge>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                    <p>{app.objects.length} objects</p>
                    <p>{app.actions.length} actions</p>
                    <p>{app.views.length} views</p>
                  </div>
                  {app.actions.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {app.actions.map((action) => (
                        <Badge className="border-border bg-white text-foreground" key={action.actionId}>
                          {action.actionId}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </div>

          <div className="border border-border bg-white p-5">
            <h2 className="flex items-center text-base font-semibold">
              <Play className="mr-2 h-4 w-4" />
              Invoke Action
            </h2>
            <Separator className="my-4" />
            <Textarea
              className="min-h-28"
              onChange={(event) => setInvokePrompt(event.target.value)}
              value={invokePrompt}
            />
            <Button className="mt-4" disabled={isInvoking} onClick={() => void invokeDevAgentAction()} type="button">
              <Play className="mr-2 h-4 w-4" />
              {isInvoking ? "Invoking" : "Invoke Dev Agent"}
            </Button>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          <div className="border border-border bg-white p-5">
            <h2 className="flex items-center text-base font-semibold">
              <Settings className="mr-2 h-4 w-4" />
              Services
            </h2>
            <Separator className="my-4" />
            <div className="space-y-3">
              {services.map((service) => (
                <article className="text-sm" key={service.serviceId}>
                  <p className="font-medium">{service.manifest.name ?? service.manifest.id}</p>
                  <p className="text-muted-foreground">
                    {service.manifest.packageName ?? service.serviceId} · v{service.manifest.version}
                  </p>
                  <p className="text-muted-foreground">{service.lifecycleState}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="border border-border bg-white p-5">
            <h2 className="flex items-center text-base font-semibold">
              <Cable className="mr-2 h-4 w-4" />
              Bindings
            </h2>
            <Separator className="my-4" />
            <div className="space-y-3">
              {bindings.map((binding) => (
                <article className="text-sm" key={binding.bindingId}>
                  <p className="font-medium">{binding.requirement}</p>
                  <p className="text-muted-foreground">
                    {binding.environment} · {binding.provider}{binding.model ? ` · ${binding.model}` : ""}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="border border-border bg-white p-5">
            <h2 className="flex items-center text-base font-semibold">
              <History className="mr-2 h-4 w-4" />
              Executions
            </h2>
            <Separator className="my-4" />
            <div className="space-y-3">
              {runtimeRuns.slice(0, 4).map(({ run, traces }) => (
                <article className="text-sm" key={run.runId}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{run.actionId ?? run.runId}</p>
                    <Badge className="border-border bg-background text-foreground">{run.status}</Badge>
                  </div>
                  <p className="text-muted-foreground">
                    {run.servicePackageName ?? "service"} · model {modelForRun(run.runId)}
                  </p>
                  <p className="text-muted-foreground">{traces.length} traces</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <form className="border border-border bg-white p-5" onSubmit={registerManifest}>
            <h2 className="flex items-center text-base font-semibold">
              <Braces className="mr-2 h-4 w-4" />
              Register Manifest
            </h2>
            <Separator className="my-4" />
            <Textarea
              className="min-h-80 font-mono text-xs"
              onChange={(event) => setManifestJson(event.target.value)}
              value={manifestJson}
            />
            <Button className="mt-4" type="submit">
              <Upload className="mr-2 h-4 w-4" />
              Register Manifest
            </Button>
          </form>

          <form className="border border-border bg-white p-5" onSubmit={registerBinding}>
            <h2 className="flex items-center text-base font-semibold">
              <Cable className="mr-2 h-4 w-4" />
              Register Binding
            </h2>
            <Separator className="my-4" />
            <Textarea
              className="min-h-80 font-mono text-xs"
              onChange={(event) => setBindingJson(event.target.value)}
              value={bindingJson}
            />
            <Button className="mt-4" type="submit">
              <Upload className="mr-2 h-4 w-4" />
              Register Binding
            </Button>
          </form>
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          <div className="border border-border bg-white p-5">
            <h2 className="text-base font-semibold">Memory</h2>
            <Separator className="my-4" />
            <div className="space-y-3">
              {runtimeMemory.slice(0, 4).map((memory) => (
                <article className="text-sm" key={memory.memoryId}>
                  <p className="font-medium">{memory.kind}</p>
                  <p className="line-clamp-2 text-muted-foreground">{memory.content}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="border border-border bg-white p-5">
            <h2 className="text-base font-semibold">Artifacts</h2>
            <Separator className="my-4" />
            <div className="space-y-3">
              {runtimeArtifacts.slice(0, 4).map((artifact) => (
                <article className="text-sm" key={artifact.artifactId}>
                  <p className="font-medium">{artifact.objectUri}</p>
                  <p className="text-muted-foreground">
                    {artifact.contentType} · {artifact.sizeBytes} bytes
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="border border-border bg-white p-5">
            <h2 className="text-base font-semibold">Manifest Registry</h2>
            <Separator className="my-4" />
            <div className="space-y-3">
              {manifestRecords.slice(0, 6).map((record) => (
                <article className="text-sm" key={record.manifestId}>
                  <p className="font-medium">{record.kind}</p>
                  <p className="text-muted-foreground">
                    id: {record.resourceId} · version: {record.version} · lifecycle: {record.lifecycleState}
                  </p>
                  <p className="text-muted-foreground">{scopeLabel(record.scope)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <form className="border border-border bg-white p-5" onSubmit={registerOAuthApp}>
            <h2 className="text-base font-semibold">OAuth App Registration</h2>
            <Separator className="my-4" />
            <div className="space-y-3">
              <Input onChange={(event) => setDisplayName(event.target.value)} value={displayName} />
              <select
                className="h-10 w-full border border-input bg-background px-3 text-sm"
                onChange={(event) => setAppType(event.target.value as OAuthAppRecord["appType"])}
                value={appType}
              >
                <option value="consumer">consumer</option>
                <option value="provider">provider</option>
                <option value="both">both</option>
              </select>
            </div>
            <Button className="mt-4" type="submit">Register OAuth App</Button>
          </form>

          <form className="border border-border bg-white p-5" onSubmit={registerCapability}>
            <h2 className="text-base font-semibold">Capability Registration</h2>
            <Separator className="my-4" />
            <div className="space-y-3">
              <Input onChange={(event) => setCapabilityName(event.target.value)} value={capabilityName} />
              <Input onChange={(event) => setCapabilityVersion(event.target.value)} value={capabilityVersion} />
              <select
                className="h-10 w-full border border-input bg-background px-3 text-sm"
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
            <Button className="mt-4" type="submit">Register Capability</Button>
          </form>
        </section>
      </div>
    </main>
  );
}
