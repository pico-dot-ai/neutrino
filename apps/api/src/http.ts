import { createServer } from "node:http";
import { Readable } from "node:stream";
import { z } from "zod";
import type { LanguageModelProvider } from "@neutrino/ports";
import type {
  ChatMessage,
  PlatformManifest,
  PicoAgentManifest,
  PicoAppManifest,
  PicoBindingManifest,
  PicoHarnessManifest
} from "@neutrino/schema";
import {
  createInMemoryCoreRepositories,
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

const devAgentScope = {
  workspaceId: "workspace_picoai",
  projectId: "project_dev_agent"
};

function randomId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
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

export function createAppHandler(options: {
  aiProvider: LanguageModelProvider;
  env: ApiEnv;
}) {
  const controlPlane = createPlatformControlPlane();
  const core = createInMemoryCoreRepositories();
  const runtime = new DevAgentRuntime({
    languageModelProvider: options.aiProvider,
    runRepository: core.runRepository,
    traceRepository: core.traceRepository,
    usageLedger: core.usageLedger
  });
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
        for await (const event of runtime.stream({
          scope: runtimeManifests.scope,
          appId: runtimeManifests.app.id,
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

      if (pathname.startsWith("/v1/control-plane/")) {
        if (!isAuthorized(request, options.env)) {
          return json(401, { error: "Unauthorized." });
        }

        const adminEmail = request.headers.get("x-pico-admin-email") ?? "unknown@pico.ai";
        controlPlane.usageLedger.track(`admin:${adminEmail}`);

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
          const runsWithTraces = await Promise.all(
            runs.map(async (run) => ({
              run,
              traces: await core.traceRepository.listTraces(run.runId)
            }))
          );

          return json(200, {
            scope: devAgentScope,
            runs: runsWithTraces,
            usage
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
