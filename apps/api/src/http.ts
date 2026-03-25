import { createServer } from "node:http";
import { Readable } from "node:stream";
import { z } from "zod";
import type { AIProvider, ChatMessage } from "@neutrino/contracts";
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

export function createAppHandler(options: {
  aiProvider: AIProvider;
  env: ApiEnv;
}) {
  return async function handleRequest(request: Request): Promise<Response> {
    try {
      const { pathname } = new URL(request.url);

      if (request.method === "GET" && pathname === "/healthz") {
        return json(200, { status: "ok" });
      }

      if (request.method === "GET" && pathname === "/readyz") {
        return json(200, { status: "ready" });
      }

      if (request.method === "POST" && pathname === "/v1/chat") {
        if (request.headers.get("x-api-proxy-secret") !== options.env.API_PROXY_SHARED_SECRET) {
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
  aiProvider: AIProvider;
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
        : Readable.toWeb(request) as ReadableStream;

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
