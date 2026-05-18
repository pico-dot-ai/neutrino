import { createServer } from "node:http";
import { Readable } from "node:stream";
import { z } from "zod";
import type { LanguageModelProvider } from "@neutrino/ports";
import type { ChatMessage } from "@neutrino/schema";
import { createPlatformControlPlane } from "@neutrino/platform-gateway";
import type { ApiEnv } from "./env";

const chatRequestSchema = z.object({
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

export function createAppHandler(options: {
  aiProvider: LanguageModelProvider;
  env: ApiEnv;
}) {
  const controlPlane = createPlatformControlPlane();

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

        let finalText = "";
        const events: Array<
          | {
              type: "delta";
              text: string;
            }
          | {
              type: "done";
              text: string;
            }
          | {
              type: "error";
              message: string;
            }
        > = [];

        for await (const event of options.aiProvider.stream({
          model: options.env.OPENAI_MODEL,
          messages: payload.messages as ChatMessage[]
        })) {
          if (event.type === "delta") {
            finalText += event.text;
            events.push(event);
          } else if (event.type === "done") {
            finalText = event.text;
            events.push(event);
          }
        }

        if (!finalText) {
          events.push({
            type: "done",
            text: finalText
          });
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
