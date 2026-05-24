import { createServer } from "node:http";
import { Readable } from "node:stream";
import { z } from "zod";
import type { LanguageModelProvider, ObjectStorage } from "@neutrino/ports";
import type {
  ChatMessage,
  PlatformManifest,
  PicoAgentManifest,
  PicoAppManifest,
  PicoBindingManifest,
  PicoHarnessManifest,
  ScopeRef
} from "@neutrino/schema";
import {
  createCoreRepositories,
  DevAgentRuntime,
  devAgentAppManifest,
  devAgentHarnessManifest,
  devAgentLocalBindingManifest,
  devAgentManifest,
  devAgentServiceManifest,
  devAgentSkillManifest,
  validatePlatformManifest
} from "@neutrino/core";
import { createPlatformControlPlane } from "@neutrino/platform-gateway";
import type { ApiEnv } from "./env";
import { createArtifactChecksum, createObjectStorage } from "./object-storage";

const chatRequestSchema = z.object({
  runtime: z
    .object({
      workspaceId: z.string().min(1).optional(),
      projectId: z.string().min(1).optional(),
      agentId: z.string().min(1).optional()
    })
    .optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string().min(1)
      })
    )
    .min(1)
});

const registerOAuthAppSchema = z.object({
  displayName: z.string().min(1),
  description: z.string().optional(),
  appType: z.enum(["consumer", "provider", "both"]),
  ownerOrgId: z.string().min(1),
  redirectUris: z.array(z.string().url()).optional(),
  allowedScopes: z.array(z.string().min(1)).optional()
});

const updateOAuthAppSchema = z.object({
  app_id: z.string().min(1),
  displayName: z.string().min(1).optional(),
  description: z.string().optional(),
  appType: z.enum(["consumer", "provider", "both"]).optional(),
  redirectUris: z.array(z.string().url()).optional(),
  allowedScopes: z.array(z.string().min(1)).optional()
});

const picoAppTargetSchema = z.object({
  app_id: z.string().min(1)
});

const assignAppAdminSchema = z.object({
  app_id: z.string().min(1),
  email: z.string().email()
});

const registerCapabilitySchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  ownerAppId: z.string().min(1),
  description: z.string().optional(),
  scopes: z.array(z.string().min(1)).optional(),
  limits: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional()
});

const capabilityIdSchema = z.object({
  capabilityId: z.string().min(1),
  eolAt: z.string().datetime().optional()
});

const devAgentScope = {
  workspaceId: "workspace_picoai",
  projectId: "project_dev_agent"
};

const scopeSchema = z.object({
  workspaceId: z.string().min(1).default(devAgentScope.workspaceId),
  orgId: z.string().min(1).optional(),
  groupId: z.string().min(1).optional(),
  projectId: z.string().min(1).default(devAgentScope.projectId),
  appInstallationId: z.string().min(1).optional()
});

const registerManifestSchema = z.object({
  scope: scopeSchema.optional(),
  lifecycleState: z.enum(["draft", "active", "deprecated", "disabled"]).optional(),
  manifest: z.custom<PlatformManifest>((value) => Boolean(value) && typeof value === "object")
});

const registerBindingSchema = z.object({
  scope: scopeSchema.optional(),
  lifecycleState: z.enum(["draft", "active", "deprecated", "disabled"]).optional(),
  manifest: z.custom<PicoBindingManifest>((value) => Boolean(value) && typeof value === "object")
});

const invokeActionSchema = z.object({
  scope: scopeSchema.optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string().min(1)
      })
    )
    .min(1)
});

function json(status: number, payload: unknown) {
  return Response.json(payload, { status });
}

function sse(payloads: unknown[]) {
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      start(controller) {
        for (const payload of payloads) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        }
        controller.close();
      }
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive"
      }
    }
  );
}

function isAuthorized(request: Request, env: ApiEnv) {
  return request.headers.get("x-api-proxy-secret") === env.API_PROXY_SHARED_SECRET;
}

function randomId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeScope(scope?: ScopeRef): ScopeRef {
  return {
    workspaceId: scope?.workspaceId ?? devAgentScope.workspaceId,
    ...(scope?.orgId ? { orgId: scope.orgId } : {}),
    ...(scope?.groupId ? { groupId: scope.groupId } : {}),
    projectId: scope?.projectId ?? devAgentScope.projectId,
    ...(scope?.appInstallationId ? { appInstallationId: scope.appInstallationId } : {})
  };
}

function parseServiceReference(serviceReference?: string) {
  if (!serviceReference) {
    return {
      servicePackageName: devAgentServiceManifest.packageName,
      serviceVersion: devAgentServiceManifest.version
    };
  }

  const separator = serviceReference.lastIndexOf("@");
  if (separator <= 0) {
    return {
      servicePackageName: serviceReference,
      serviceVersion: undefined
    };
  }

  const versionText = serviceReference.slice(separator + 1);
  const majorVersion = Number(versionText.split(".")[0]);
  return {
    servicePackageName: serviceReference.slice(0, separator),
    serviceVersion: Number.isFinite(majorVersion) ? majorVersion : undefined
  };
}

function appInventory(records: Array<{ manifest: PlatformManifest }>) {
  return records
    .filter((record): record is { manifest: PicoAppManifest } => record.manifest.kind === "pico.app")
    .map(({ manifest }) => ({
      id: manifest.id,
      packageName: manifest.packageName ?? manifest.id,
      name: manifest.name ?? manifest.id,
      version: manifest.version,
      visibility: manifest.visibility,
      objects: Object.entries(manifest.objects ?? {}).map(([objectId, object]) => ({
        objectId,
        ...object
      })),
      actions: Object.entries(manifest.actions ?? {}).map(([actionId, action]) => ({
        actionId,
        ...action
      })),
      views: Object.entries(manifest.views ?? {}).map(([viewId, view]) => ({
        viewId,
        ...view
      }))
    }));
}

function bindingInventory(records: Array<{ manifest: PlatformManifest; scope: ScopeRef }>) {
  return records
    .filter((record): record is { manifest: PicoBindingManifest; scope: ScopeRef } => record.manifest.kind === "pico.binding")
    .flatMap((record) =>
      Object.entries(record.manifest.bindings).map(([requirement, binding]) => ({
        bindingId: `${record.scope.workspaceId}:${record.scope.projectId ?? "workspace"}:${record.manifest.environment}:${requirement}`,
        manifestId: record.manifest.id,
        scope: record.scope,
        environment: record.manifest.environment,
        requirement,
        provider: binding.provider,
        serviceId: binding.serviceId,
        capabilityId: binding.capabilityId,
        model: binding.model
      }))
    );
}

type RuntimeManifests = {
  scope: {
    workspaceId: string;
    projectId: string;
  };
  app: PicoAppManifest;
  agent: PicoAgentManifest;
  harness: PicoHarnessManifest;
  binding: PicoBindingManifest;
};

type AdminContext = {
  email: string;
  actorId: string | null;
  groupIds: string[];
};

function parseAdminContext(request: Request): AdminContext {
  const groupsHeader = request.headers.get("x-pico-admin-groups");
  const groupIds = (groupsHeader ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((slug) => (slug.startsWith("group_") ? slug : `group_${slug}`));

  return {
    email: request.headers.get("x-pico-admin-email") ?? "unknown@pico.ai",
    actorId: request.headers.get("x-pico-admin-actor-id") ?? null,
    groupIds
  };
}

export function createAppHandler(options: {
  aiProvider: LanguageModelProvider;
  env: ApiEnv;
  repositoryConnectionString?: string | null;
  objectStorage?: ObjectStorage;
}) {
  const controlPlane = createPlatformControlPlane();
  const core = createCoreRepositories({
    connectionString:
      options.repositoryConnectionString === undefined
        ? options.env.CORE_DATABASE_URL ?? options.env.DATABASE_URL ?? null
        : options.repositoryConnectionString,
    defaultScope: devAgentScope
  });
  const runtime = new DevAgentRuntime({
    languageModelProvider: options.aiProvider,
    runRepository: core.runRepository,
    traceRepository: core.traceRepository,
    usageLedger: core.usageLedger
  });
  const objectStorage = options.objectStorage ?? createObjectStorage(options.env);
  let devAgentBootstrapPromise: Promise<void> | null = null;

  function ensureDevAgentBootstrap() {
    devAgentBootstrapPromise ??= (async () => {
      const manifests = [
        devAgentAppManifest,
        devAgentServiceManifest,
        devAgentSkillManifest,
        devAgentHarnessManifest,
        devAgentManifest,
        devAgentLocalBindingManifest
      ].map(validatePlatformManifest);

      for (const manifest of manifests) {
        await core.manifestRegistry.registerManifest({
          scope: devAgentScope,
          manifest
        });
      }

      const serviceRecord = await core.manifestRegistry.resolveManifest({
        scope: devAgentScope,
        kind: "pico.service",
        resourceId: devAgentServiceManifest.id
      });
      const serviceManifest = serviceRecord?.manifest;
      if (!serviceManifest || serviceManifest.kind !== "pico.service") {
        throw new Error("Missing Dev Agent service manifest.");
      }

      await core.serviceCatalog.registerService(serviceManifest);
      await core.bindingResolver.registerBinding(devAgentScope, devAgentLocalBindingManifest);
      const timestamp = nowIso();
      for (const [groupId, slug, displayName] of [
        ["group_picoai", "picoai", "Pico AI"],
        ["group_app_admin", "app_admin", "App Admins"],
        ["group_org_admin", "org_admin", "Org Admins"]
      ]) {
        await core.accessGraphRepository.upsertGroup({
          groupId,
          workspaceId: devAgentScope.workspaceId,
          slug,
          displayName,
          createdAt: timestamp,
          updatedAt: timestamp
        });
      }
      await core.accessGraphRepository.addGrant({
        grantId: "grant_group_app_admin_manage_workspace",
        workspaceId: devAgentScope.workspaceId,
        granteeType: "group",
        granteeId: "group_app_admin",
        relation: "can_manage",
        resourceType: "workspace",
        resourceId: devAgentScope.workspaceId,
        createdAt: timestamp
      });
      await core.accessGraphRepository.addGrant({
        grantId: "grant_group_app_admin_dev_agent_action",
        workspaceId: devAgentScope.workspaceId,
        granteeType: "group",
        granteeId: "group_app_admin",
        relation: "can_invoke",
        resourceType: "action",
        resourceId: `${devAgentAppManifest.id}:generate_reply`,
        createdAt: timestamp
      });
      for (const actorId of ["local:admin", "local:kevin@pico.ai", "actor_system"]) {
        await core.accessGraphRepository.upsertActor({
          actorId,
          workspaceId: devAgentScope.workspaceId,
          kind: actorId === "actor_system" ? "system" : "user",
          handle: actorId,
          displayName: actorId,
          createdAt: timestamp,
          updatedAt: timestamp
        });
        await core.accessGraphRepository.addGrant({
          grantId: `grant_${actorId.replace(/[^a-zA-Z0-9]/g, "_")}_dev_agent_action`,
          workspaceId: devAgentScope.workspaceId,
          granteeType: "actor",
          granteeId: actorId,
          relation: "can_invoke",
          resourceType: "action",
          resourceId: `${devAgentAppManifest.id}:generate_reply`,
          createdAt: timestamp
        });
      }
    })();

    return devAgentBootstrapPromise;
  }

  async function resolveRuntimeManifests(options?: {
    workspaceId?: string;
    projectId?: string;
    agentId?: string;
  }): Promise<RuntimeManifests> {
    await ensureDevAgentBootstrap();
    const scope = {
      workspaceId: options?.workspaceId ?? devAgentScope.workspaceId,
      projectId: options?.projectId ?? devAgentScope.projectId
    };
    const agentId = options?.agentId ?? devAgentManifest.id;

    const agentRecord = await core.manifestRegistry.resolveManifest({
      scope,
      kind: "pico.agent",
      resourceId: agentId
    });
    const agentManifest = agentRecord?.manifest;
    if (!agentManifest || agentManifest.kind !== "pico.agent") {
      throw new Error(`Unable to resolve agent manifest for ${agentId}.`);
    }

    const harnessId = agentManifest.harness;
    if (!harnessId) {
      throw new Error(`Agent ${agentId} is missing a harness reference.`);
    }
    const harnessRecord = await core.manifestRegistry.resolveManifest({
      scope,
      kind: "pico.harness",
      resourceId: harnessId
    });
    const harnessManifest = harnessRecord?.manifest;
    if (!harnessManifest || harnessManifest.kind !== "pico.harness") {
      throw new Error(`Unable to resolve harness manifest for ${harnessId}.`);
    }

    const appRecord = (
      await core.manifestRegistry.listManifests({
        scope,
        kind: "pico.app"
      })
    ).find((record) => {
      const manifest = record.manifest;
      return manifest.kind === "pico.app" && manifest.agents?.includes(agentId);
    });
    const appManifest = appRecord?.manifest;
    if (!appManifest || appManifest.kind !== "pico.app") {
      throw new Error(`Unable to resolve app manifest for agent ${agentId}.`);
    }

    const bindingRecord = await core.manifestRegistry.resolveManifest({
      scope,
      kind: "pico.binding",
      resourceId: devAgentLocalBindingManifest.id
    });
    const bindingManifest = bindingRecord?.manifest;
    if (!bindingManifest || bindingManifest.kind !== "pico.binding") {
      throw new Error("Unable to resolve binding manifest.");
    }
    await core.bindingResolver.registerBinding(scope, bindingManifest);

    return {
      scope,
      app: appManifest,
      agent: agentManifest,
      harness: harnessManifest,
      binding: bindingManifest
    };
  }

  async function canInvokeAction(options: {
    actorId: string | null;
    groupIds: string[];
    scope: ScopeRef;
    app: PicoAppManifest;
    actionId: string;
    servicePackageName?: string;
  }) {
    if (!options.actorId) {
      return false;
    }

    const action = options.app.actions?.[options.actionId];
    if (options.app.visibility?.access === "public" || action?.visibility?.access === "public") {
      return true;
    }

    const actorGrants = await core.accessGraphRepository.listGrants({
      workspaceId: options.scope.workspaceId,
      granteeType: "actor",
      granteeId: options.actorId
    });
    const groupGrants = await Promise.all(
      options.groupIds.map((groupId) =>
        core.accessGraphRepository.listGrants({
          workspaceId: options.scope.workspaceId,
          granteeType: "group",
          granteeId: groupId
        })
      )
    );
    const grants = [...actorGrants, ...groupGrants.flat()];
    return grants.some((grant) => {
      if (grant.relation !== "can_use" && grant.relation !== "can_invoke") {
        return false;
      }
      if (grant.resourceType === "app" && grant.resourceId === options.app.id) {
        return true;
      }
      if (grant.resourceType === "action" && grant.resourceId === `${options.app.id}:${options.actionId}`) {
        return true;
      }
      return grant.resourceType === "service" && grant.resourceId === options.servicePackageName;
    });
  }

  async function canManageControlPlane(scope: ScopeRef, adminContext: AdminContext) {
    if (!adminContext.actorId && adminContext.groupIds.length === 0) {
      return false;
    }

    const actorGrants = adminContext.actorId
      ? await core.accessGraphRepository.listGrants({
          workspaceId: scope.workspaceId,
          granteeType: "actor",
          granteeId: adminContext.actorId
        })
      : [];
    const groupGrants = await Promise.all(
      adminContext.groupIds.map((groupId) =>
        core.accessGraphRepository.listGrants({
          workspaceId: scope.workspaceId,
          granteeType: "group",
          granteeId: groupId
        })
      )
    );
    const grants = [...actorGrants, ...groupGrants.flat()];
    return grants.some(
      (grant) =>
        grant.relation === "can_manage" &&
        grant.resourceType === "workspace" &&
        grant.resourceId === scope.workspaceId
    );
  }

  async function resolveAppAction(options: {
    scope: ScopeRef;
    appId: string;
    actionId: string;
  }) {
    await ensureDevAgentBootstrap();
    const appRecord = await core.manifestRegistry.resolveManifest({
      scope: options.scope,
      kind: "pico.app",
      resourceId: options.appId
    });
    const app = appRecord?.manifest;
    if (!app || app.kind !== "pico.app") {
      throw new Error(`Unable to resolve app manifest for ${options.appId}.`);
    }

    const action = app.actions?.[options.actionId];
    if (!action) {
      throw new Error(`Unable to resolve action ${options.actionId} for app ${options.appId}.`);
    }

    const serviceReference = parseServiceReference(action.uses);
    const serviceRecord = (
      await core.manifestRegistry.listManifests({
        scope: options.scope,
        kind: "pico.service"
      })
    ).find((record) => {
      const manifest = record.manifest;
      return manifest.kind === "pico.service" &&
        (manifest.packageName ?? manifest.id) === serviceReference.servicePackageName &&
        (serviceReference.serviceVersion === undefined || manifest.version === serviceReference.serviceVersion);
    });
    const service = serviceRecord?.manifest;
    if (!service || service.kind !== "pico.service") {
      throw new Error(`Unable to resolve service ${action.uses ?? "default"} for action ${options.actionId}.`);
    }

    const agentId = app.agents?.[0] ?? devAgentManifest.id;
    const agentRecord = await core.manifestRegistry.resolveManifest({
      scope: options.scope,
      kind: "pico.agent",
      resourceId: agentId
    });
    const agent = agentRecord?.manifest;
    if (!agent || agent.kind !== "pico.agent") {
      throw new Error(`Unable to resolve agent manifest for ${agentId}.`);
    }
    const harnessId = agent.harness ?? app.harnesses?.[0] ?? devAgentHarnessManifest.id;
    const harnessRecord = await core.manifestRegistry.resolveManifest({
      scope: options.scope,
      kind: "pico.harness",
      resourceId: harnessId
    });
    const harness = harnessRecord?.manifest;
    if (!harness || harness.kind !== "pico.harness") {
      throw new Error(`Unable to resolve harness manifest for ${harnessId}.`);
    }
    const bindingRecord = await core.manifestRegistry.resolveManifest({
      scope: options.scope,
      kind: "pico.binding",
      resourceId: devAgentLocalBindingManifest.id
    });
    const binding = bindingRecord?.manifest;
    if (!binding || binding.kind !== "pico.binding") {
      throw new Error("Unable to resolve binding manifest.");
    }
    await core.bindingResolver.registerBinding(options.scope, binding);

    return { app, action, service, agent, harness, binding };
  }

  return async function handleRequest(request: Request): Promise<Response> {
    try {
      const { pathname } = new URL(request.url);

      if (request.method === "GET" && (pathname === "/healthz" || pathname === "/health")) {
        return json(200, { status: "ok" });
      }

      if (request.method === "GET" && (pathname === "/readyz" || pathname === "/ready")) {
        return json(200, { status: "ready" });
      }

      if (request.method === "POST" && pathname === "/v1/chat") {
        if (!isAuthorized(request, options.env)) {
          return json(401, { error: "Unauthorized." });
        }

        const payload = chatRequestSchema.parse(await request.json());
        let runtimeManifests: RuntimeManifests;
        try {
          runtimeManifests = await resolveRuntimeManifests(payload.runtime);
        } catch (error) {
          return sse([
            {
              type: "error",
              message:
                error instanceof Error
                  ? error.message
                  : "Unable to resolve runtime manifests."
            }
          ]);
        }
        const languageModelBinding = await core.bindingResolver.resolveBinding({
          scope: runtimeManifests.scope,
          environment: runtimeManifests.binding.environment,
          requirement: "languageModel"
        });

        if (!languageModelBinding) {
          return sse([
            {
              type: "error",
              message: "Missing Dev Agent language model binding."
            }
          ]);
        }

        const events = [];
        const adminContext = parseAdminContext(request);
        const actorId = adminContext.actorId ?? "actor_system";
        for await (const event of runtime.stream({
          scope: runtimeManifests.scope,
          appId: runtimeManifests.app.id,
          actionId: "generate_reply",
          actorId,
          servicePackageName: devAgentServiceManifest.packageName,
          serviceVersion: devAgentServiceManifest.version,
          bindingSnapshotId: runtimeManifests.binding.id,
          schemaVersions: {
            input: devAgentAppManifest.actions?.generate_reply?.input ?? "",
            output: devAgentAppManifest.actions?.generate_reply?.output ?? ""
          },
          agentId: runtimeManifests.agent.id,
          harnessId: runtimeManifests.harness.id,
          conversationId: randomId("conversation"),
          model: options.env.OPENAI_MODEL || languageModelBinding.model || "gpt-5.2",
          messages: payload.messages as ChatMessage[]
        })) {
          events.push(event);
        }

        return sse(events);
      }

      const actionInvokeMatch = pathname.match(/^\/v1\/apps\/([^/]+)\/actions\/([^/]+)\/invoke$/);
      if (request.method === "POST" && actionInvokeMatch) {
        if (!isAuthorized(request, options.env)) {
          return json(401, { error: "Unauthorized." });
        }

        const adminContext = parseAdminContext(request);
        const actorId = adminContext.actorId;
        const payload = invokeActionSchema.parse(await request.json());
        const scope = normalizeScope(payload.scope);
        const appId = decodeURIComponent(actionInvokeMatch[1] ?? "");
        const actionId = decodeURIComponent(actionInvokeMatch[2] ?? "");
        const resolved = await resolveAppAction({ scope, appId, actionId });
        const servicePackageName = resolved.service.packageName ?? resolved.service.id;

        if (
          !(await canInvokeAction({
            actorId,
            groupIds: adminContext.groupIds,
            scope,
            app: resolved.app,
            actionId,
            servicePackageName
          }))
        ) {
          return json(403, { error: "Actor is not allowed to invoke this action." });
        }

        const languageModelBinding = await core.bindingResolver.resolveBinding({
          scope,
          environment: resolved.binding.environment,
          requirement: "languageModel"
        });
        if (!languageModelBinding) {
          return json(409, { error: "Missing language model binding." });
        }

        const result = await runtime.run({
          scope,
          appId: resolved.app.id,
          actionId,
          actorId: actorId ?? undefined,
          servicePackageName,
          serviceVersion: resolved.service.version,
          bindingSnapshotId: resolved.binding.id,
          schemaVersions: {
            ...(resolved.action.input ? { input: resolved.action.input } : {}),
            ...(resolved.action.output ? { output: resolved.action.output } : {})
          },
          agentId: resolved.agent.id,
          harnessId: resolved.harness.id,
          conversationId: randomId("conversation"),
          model: options.env.OPENAI_MODEL || languageModelBinding.model || "gpt-5.2",
          messages: payload.messages as ChatMessage[]
        });

        const outputText = result.run.output ?? result.run.error ?? "";
        const outputBytes = new TextEncoder().encode(outputText);
        const objectResult = await objectStorage.writeObject({
          key: `runs/${result.run.runId}/output.txt`,
          body: outputBytes,
          contentType: "text/plain"
        });
        const memory = await core.memoryRepository.writeMemory({
          memoryId: randomId("memory"),
          scope,
          kind: result.run.status === "succeeded" ? "action_output" : "action_error",
          content: outputText,
          sourceRunId: result.run.runId,
          createdAt: nowIso()
        });
        const artifact = await core.artifactRepository.createArtifact({
          artifactId: randomId("artifact"),
          scope,
          objectUri: objectResult.uri,
          contentType: objectResult.contentType,
          sizeBytes: objectResult.sizeBytes,
          checksum: createArtifactChecksum(outputBytes),
          createdAt: nowIso()
        });

        return json(result.run.status === "failed" ? 500 : 200, {
          scope,
          run: result.run,
          traces: result.traces,
          memory,
          artifact
        });
      }

      if (pathname.startsWith("/v1/control-plane/")) {
        if (!isAuthorized(request, options.env)) {
          return json(401, { error: "Unauthorized." });
        }

        await ensureDevAgentBootstrap();
        const adminContext = parseAdminContext(request);
        controlPlane.usageLedger.track(`admin:${adminContext.email}`);
        const isControlPlaneWrite =
          request.method !== "GET" && request.method !== "HEAD";
        if (isControlPlaneWrite && !(await canManageControlPlane(devAgentScope, adminContext))) {
          return json(403, { error: "Actor is not allowed to manage control-plane resources." });
        }

        if (request.method === "GET" && pathname === "/v1/control-plane/context") {
          await ensureDevAgentBootstrap();
          return json(200, {
            scope: devAgentScope,
            actor: {
              actorId: adminContext.actorId,
              email: adminContext.email
            }
          });
        }

        if (request.method === "GET" && pathname === "/v1/control-plane/oauth-apps") {
          const apps = await controlPlane.oauthClientCatalog.listOAuthApps();
          return json(200, { apps });
        }

        if (request.method === "POST" && pathname === "/v1/control-plane/oauth-apps/register") {
          const payload = registerOAuthAppSchema.parse(await request.json());
          const created = await controlPlane.oauthClientCatalog.registerOAuthApp(payload);
          controlPlane.usageLedger.track(`oauth:register:${created.app.app_id}`);
          return json(201, created);
        }

        if (request.method === "POST" && pathname === "/v1/control-plane/oauth-apps/update") {
          const payload = updateOAuthAppSchema.parse(await request.json());
          const app = await controlPlane.oauthClientCatalog.updateOAuthApp(payload);
          controlPlane.usageLedger.track(`oauth:update:${app.app_id}`);
          return json(200, { app });
        }

        if (
          request.method === "POST" &&
          pathname === "/v1/control-plane/oauth-apps/rotate-credential"
        ) {
          const payload = picoAppTargetSchema.parse(await request.json());
          const rotated = await controlPlane.oauthClientCatalog.rotateCredential(payload);
          controlPlane.usageLedger.track(`oauth:rotate:${payload.app_id}`);
          return json(200, rotated);
        }

        if (
          request.method === "POST" &&
          pathname === "/v1/control-plane/oauth-apps/revoke-credential"
        ) {
          const payload = picoAppTargetSchema.parse(await request.json());
          const app = await controlPlane.oauthClientCatalog.revokeCredential(payload);
          controlPlane.usageLedger.track(`oauth:revoke:${payload.app_id}`);
          return json(200, { app });
        }

        if (
          request.method === "POST" &&
          pathname === "/v1/control-plane/oauth-apps/approve-production-activation"
        ) {
          const payload = picoAppTargetSchema.parse(await request.json());
          const app = await controlPlane.oauthClientCatalog.approveProductionActivation(payload);
          controlPlane.usageLedger.track(`oauth:approve:${payload.app_id}`);
          return json(200, { app });
        }

        if (
          request.method === "POST" &&
          pathname === "/v1/control-plane/oauth-apps/assign-app-admin"
        ) {
          const payload = assignAppAdminSchema.parse(await request.json());
          const app = await controlPlane.oauthClientCatalog.assignAppAdmin(payload);
          controlPlane.usageLedger.track(`oauth:assign-admin:${payload.app_id}`);
          return json(200, { app });
        }

        if (request.method === "GET" && pathname === "/v1/control-plane/capabilities") {
          const capabilities = await controlPlane.capabilityCatalog.listCapabilities();
          return json(200, { capabilities });
        }

        if (
          request.method === "POST" &&
          pathname === "/v1/control-plane/capabilities/register"
        ) {
          const payload = registerCapabilitySchema.parse(await request.json());
          const capability = await controlPlane.capabilityCatalog.registerCapability(payload);
          controlPlane.usageLedger.track(`capability:register:${capability.capabilityId}`);
          return json(201, { capability });
        }

        if (
          request.method === "POST" &&
          pathname === "/v1/control-plane/capabilities/publish"
        ) {
          const payload = capabilityIdSchema.pick({ capabilityId: true }).parse(await request.json());
          const capability = await controlPlane.capabilityCatalog.publishCapability(payload);
          controlPlane.usageLedger.track(`capability:publish:${capability.capabilityId}`);
          return json(200, { capability });
        }

        if (
          request.method === "POST" &&
          pathname === "/v1/control-plane/capabilities/deprecate"
        ) {
          const payload = capabilityIdSchema.parse(await request.json());
          const capability = await controlPlane.capabilityCatalog.deprecateCapability(payload);
          controlPlane.usageLedger.track(`capability:deprecate:${capability.capabilityId}`);
          return json(200, { capability });
        }

        if (request.method === "GET" && pathname === "/v1/control-plane/usage") {
          return json(200, { usage: controlPlane.usageLedger.list() });
        }

        if (request.method === "GET" && pathname === "/v1/control-plane/runtime/runs") {
          await ensureDevAgentBootstrap();
          const runs = await core.runRepository.listRuns(devAgentScope);
          const usage = await core.usageLedger.listUsage(devAgentScope);
          const memory = await core.memoryRepository.listMemory(devAgentScope);
          const artifacts = await core.artifactRepository.listArtifacts(devAgentScope);
          const runsWithTraces = await Promise.all(
            runs.map(async (run) => ({
              run,
              traces: await core.traceRepository.listTraces(run.runId)
            }))
          );

          return json(200, {
            scope: devAgentScope,
            runs: runsWithTraces,
            usage,
            memory,
            artifacts
          });
        }

        if (request.method === "GET" && pathname === "/v1/control-plane/manifests") {
          await ensureDevAgentBootstrap();
          const url = new URL(request.url);
          const kind = url.searchParams.get("kind");
          const resourceId = url.searchParams.get("resourceId");
          const manifests = await core.manifestRegistry.listManifests({
            scope: devAgentScope,
            ...(kind ? { kind: kind as PlatformManifest["kind"] } : {}),
            ...(resourceId ? { resourceId } : {})
          });

          return json(200, { manifests });
        }

        if (request.method === "POST" && pathname === "/v1/control-plane/manifests/register") {
          const payload = registerManifestSchema.parse(await request.json());
          const manifest = validatePlatformManifest(payload.manifest);
          const scope = normalizeScope(payload.scope);
          if (!(await canManageControlPlane(scope, adminContext))) {
            return json(403, { error: "Actor is not allowed to manage control-plane resources." });
          }
          const record = await core.manifestRegistry.registerManifest({
            scope,
            manifest,
            lifecycleState: payload.lifecycleState
          });
          if (manifest.kind === "pico.service") {
            await core.serviceCatalog.registerService(manifest);
          }
          if (manifest.kind === "pico.binding") {
            await core.bindingResolver.registerBinding(scope, manifest);
          }
          return json(201, { manifest: record });
        }

        if (request.method === "GET" && pathname === "/v1/control-plane/apps") {
          await ensureDevAgentBootstrap();
          const manifests = await core.manifestRegistry.listManifests({
            scope: devAgentScope,
            kind: "pico.app"
          });
          return json(200, { apps: appInventory(manifests) });
        }

        if (request.method === "GET" && pathname === "/v1/control-plane/services") {
          await ensureDevAgentBootstrap();
          const services = await core.serviceCatalog.listServices(devAgentScope);
          return json(200, { services });
        }

        if (request.method === "GET" && pathname === "/v1/control-plane/bindings") {
          await ensureDevAgentBootstrap();
          const manifests = await core.manifestRegistry.listManifests({
            scope: devAgentScope,
            kind: "pico.binding"
          });
          return json(200, { bindings: bindingInventory(manifests) });
        }

        if (request.method === "POST" && pathname === "/v1/control-plane/bindings/register") {
          const payload = registerBindingSchema.parse(await request.json());
          const manifest = validatePlatformManifest(payload.manifest);
          if (manifest.kind !== "pico.binding") {
            return json(400, { error: "Binding registration requires a pico.binding manifest." });
          }
          const scope = normalizeScope(payload.scope);
          if (!(await canManageControlPlane(scope, adminContext))) {
            return json(403, { error: "Actor is not allowed to manage control-plane resources." });
          }
          const record = await core.manifestRegistry.registerManifest({
            scope,
            manifest,
            lifecycleState: payload.lifecycleState
          });
          const bindings = await core.bindingResolver.registerBinding(scope, manifest);
          return json(201, { manifest: record, bindings });
        }
      }

      return json(404, { error: "Not found." });
    } catch (error) {
      const isValidationError = error instanceof z.ZodError;
      const message =
        isValidationError
          ? "Invalid request payload."
          : error instanceof Error
            ? error.message
            : "Unexpected server error.";

      return json(isValidationError ? 400 : 500, { error: message });
    }
  };
}

export function createHttpServer(options: {
  aiProvider: LanguageModelProvider;
  env: ApiEnv;
}) {
  const handler = createAppHandler(options);

  return createServer(async (request, response) => {
    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          headers.append(key, item);
        }
      } else if (value !== undefined) {
        headers.set(key, value);
      }
    }

    const origin = `http://${request.headers.host ?? "127.0.0.1"}`;
    const url = new URL(request.url ?? "/", origin);
    const body =
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : (Readable.toWeb(request) as ReadableStream);

    const webResponse = await handler(
      new Request(url, {
        method: request.method,
        headers,
        ...(body
          ? {
              body,
              duplex: "half" as const
            }
          : {})
      })
    );

    response.writeHead(webResponse.status, Object.fromEntries(webResponse.headers.entries()));

    if (!webResponse.body) {
      response.end();
      return;
    }

    const reader = webResponse.body.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      response.write(Buffer.from(value));
    }

    response.end();
  });
}
