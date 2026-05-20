"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Button, Input, Separator } from "@neutrino/ui";

type PrincipalPayload = {
  principal: {
    username: string;
    email: string;
    roles: string[];
    orgMemberships: string[];
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
  const [principal, setPrincipal] = React.useState<PrincipalPayload["principal"] | null>(null);
  const [oauthApps, setOauthApps] = React.useState<OAuthAppRecord[]>([]);
  const [capabilities, setCapabilities] = React.useState<CapabilityRecord[]>([]);
  const [runtimeRuns, setRuntimeRuns] = React.useState<RuntimeRunRecord[]>([]);
  const [message, setMessage] = React.useState<string | null>(null);
  const [displayName, setDisplayName] = React.useState("Sample Internal App");
  const [appType, setAppType] = React.useState<OAuthAppRecord["appType"]>("consumer");
  const [capabilityName, setCapabilityName] = React.useState("decision-tracker");
  const [capabilityVersion, setCapabilityVersion] = React.useState("0.1.0");
  const [ownerAppId, setOwnerPicoAppId] = React.useState("");

  const refresh = React.useCallback(async () => {
    const [me, appList, capabilityList, runtimeList] = await Promise.all([
      requestJson<PrincipalPayload>("/api/auth/me"),
      requestJson<{ apps: OAuthAppRecord[] }>("/api/platform/oauth-apps"),
      requestJson<{ capabilities: CapabilityRecord[] }>("/api/platform/capabilities"),
      requestJson<{ runs: RuntimeRunRecord[] }>("/api/platform/runtime/runs")
    ]);

    setPrincipal(me.principal);
    setOauthApps(appList.apps);
    setCapabilities(capabilityList.capabilities);
    setRuntimeRuns(runtimeList.runs);

    setOwnerPicoAppId((currentOwnerPicoAppId) =>
      currentOwnerPicoAppId || appList.apps[0]?.app_id || ""
    );
  }, []);

  React.useEffect(() => {
    void refresh().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Unable to load console.");
    });
  }, [refresh]);

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

  async function logout() {
    await fetch("/api/auth/logout", {
      method: "POST"
    });
    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafe,#eef3fb)] px-6 py-8 sm:px-10 sm:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-3xl border border-border/85 bg-white/90 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.07)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">Neutrino</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">Developer Console</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Register OAuth apps, manage capability publishing, and verify internal platform metadata keyed by <code>app_id</code>.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full border-border bg-background/80 text-foreground">Internal-only v1</Badge>
              <Link href="/admin/debug/chat">
                <Button size="sm" variant="secondary">Open Debug Chat</Button>
              </Link>
              <Button onClick={() => void logout()} size="sm" variant="ghost">Logout</Button>
            </div>
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{principal?.email ?? "..."}</span>
          </div>
        </header>

        {message ? (
          <p className="rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm text-foreground">
            {message}
          </p>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-2">
          <form className="rounded-3xl border border-border/85 bg-white/90 p-6" onSubmit={registerOAuthApp}>
            <h2 className="text-lg font-semibold tracking-tight">Register OAuth App</h2>
            <p className="mt-1 text-sm text-muted-foreground">Creates a new internal app with generated credentials.</p>
            <div className="mt-4 space-y-3">
              <Input onChange={(event) => setDisplayName(event.target.value)} value={displayName} />
              <select
                className="h-11 w-full rounded-full border border-input bg-background px-4 text-sm"
                onChange={(event) => setAppType(event.target.value as OAuthAppRecord["appType"])}
                value={appType}
              >
                <option value="consumer">consumer</option>
                <option value="provider">provider</option>
                <option value="both">both</option>
              </select>
            </div>
            <Button className="mt-4" type="submit">Register App</Button>
          </form>

          <form className="rounded-3xl border border-border/85 bg-white/90 p-6" onSubmit={registerCapability}>
            <h2 className="text-lg font-semibold tracking-tight">Register Capability</h2>
            <p className="mt-1 text-sm text-muted-foreground">Publishes a draft capability owned by a provider app.</p>
            <div className="mt-4 space-y-3">
              <Input onChange={(event) => setCapabilityName(event.target.value)} value={capabilityName} />
              <Input onChange={(event) => setCapabilityVersion(event.target.value)} value={capabilityVersion} />
              <select
                className="h-11 w-full rounded-full border border-input bg-background px-4 text-sm"
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

        <section className="rounded-3xl border border-border/85 bg-white/90 p-6">
          <h2 className="text-lg font-semibold tracking-tight">OAuth Apps</h2>
          <Separator className="my-4" />
          <div className="space-y-3">
            {oauthApps.length === 0 ? (
              <p className="text-sm text-muted-foreground">No apps registered yet.</p>
            ) : (
              oauthApps.map((app) => (
                <article key={app.app_id} className="rounded-2xl border border-border/80 bg-background/80 px-4 py-3 text-sm">
                  <p className="font-medium">{app.displayName}</p>
                  <p className="text-muted-foreground">{app.app_id}</p>
                  <p className="text-muted-foreground">
                    type: {app.appType} · status: {app.status} · prod approved: {String(app.productionApproved)}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-border/85 bg-white/90 p-6">
          <h2 className="text-lg font-semibold tracking-tight">Capabilities</h2>
          <Separator className="my-4" />
          <div className="space-y-3">
            {capabilities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No capabilities registered yet.</p>
            ) : (
              capabilities.map((capability) => (
                <article
                  className="rounded-2xl border border-border/80 bg-background/80 px-4 py-3 text-sm"
                  key={capability.capabilityId}
                >
                  <p className="font-medium">{capability.name} {capability.version}</p>
                  <p className="text-muted-foreground">{capability.capabilityId}</p>
                  <p className="text-muted-foreground">
                    owner: {capability.ownerAppId} · lifecycle: {capability.lifecycleState} · internalOnly: {String(capability.internalOnly)}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-border/85 bg-white/90 p-6">
          <h2 className="text-lg font-semibold tracking-tight">Dev Agent Runtime</h2>
          <Separator className="my-4" />
          <div className="space-y-3">
            {runtimeRuns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No runtime runs recorded yet.</p>
            ) : (
              runtimeRuns.slice(0, 5).map(({ run, traces }) => (
                <article className="rounded-2xl border border-border/80 bg-background/80 px-4 py-3 text-sm" key={run.runId}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{run.runId}</p>
                    <Badge className="rounded-full border-border bg-background/80 text-foreground">{run.status}</Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    agent: {run.agentId} · harness: {run.harnessId}
                  </p>
                  <p className="text-muted-foreground">
                    traces: {traces.length} · started: {new Date(run.startedAt).toLocaleString()}
                  </p>
                  {run.output ? (
                    <p className="mt-2 line-clamp-2 text-foreground">{run.output}</p>
                  ) : null}
                  {run.error ? (
                    <p className="mt-2 text-destructive">{run.error}</p>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
