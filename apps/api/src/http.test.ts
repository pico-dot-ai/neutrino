import { describe, expect, it } from "vitest";
import type { LanguageModelProvider } from "@neutrino/ports";
import type { GenerateRequest } from "@neutrino/schema";
import { createAppHandler } from "./http";

class FakeProvider implements LanguageModelProvider {
  async generate(request: GenerateRequest) {
    return { content: `generated with ${request.model}` };
  }

  async *stream(request: GenerateRequest) {
    yield { type: "delta", text: "generated" } as const;
    yield { type: "done", text: `generated with ${request.model}` } as const;
  }
}

describe("createHttpServer", () => {
  it("returns health status", async () => {
    const handler = createAppHandler({
      aiProvider: new FakeProvider(),
      env: {
        PORT: 0,
        OPENAI_API_KEY: "test",
        OPENAI_MODEL: "gpt-5-mini",
        API_PROXY_SHARED_SECRET: "secret"
      }
    });

    const response = await handler(new Request("http://127.0.0.1/health"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("streams chat events when authorized", async () => {
    const handler = createAppHandler({
      aiProvider: new FakeProvider(),
      env: {
        PORT: 0,
        OPENAI_API_KEY: "test",
        OPENAI_MODEL: "gpt-5-mini",
        API_PROXY_SHARED_SECRET: "secret"
      }
    });

    const response = await handler(
      new Request("http://127.0.0.1/v1/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-proxy-secret": "secret"
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hello" }]
        })
      })
    );

    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toContain('"type":"delta"');
    expect(text).toContain('"type":"done"');
    expect(text).toContain("generated with gpt-5-mini");
  });

  it("exposes persisted Dev Agent runtime runs through authorized control-plane endpoint", async () => {
    const handler = createAppHandler({
      aiProvider: new FakeProvider(),
      env: {
        PORT: 0,
        OPENAI_API_KEY: "test",
        OPENAI_MODEL: "gpt-5-mini",
        API_PROXY_SHARED_SECRET: "secret"
      }
    });

    await handler(
      new Request("http://127.0.0.1/v1/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-proxy-secret": "secret"
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hello" }]
        })
      })
    );

    const response = await handler(
      new Request("http://127.0.0.1/v1/control-plane/runtime/runs", {
        method: "GET",
        headers: {
          "x-api-proxy-secret": "secret",
          "x-pico-admin-email": "admin@pico.ai"
        }
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        runs: [
          expect.objectContaining({
            run: expect.objectContaining({
              status: "succeeded",
              output: "generated with gpt-5-mini"
            }),
            traces: expect.arrayContaining([
              expect.objectContaining({
                eventType: "runtime.started"
              })
            ])
          })
        ],
        usage: [
          expect.objectContaining({
            model: "gpt-5-mini"
          })
        ]
      })
    );
  });

  it("registers an OAuth app through control-plane endpoint", async () => {
    const handler = createAppHandler({
      aiProvider: new FakeProvider(),
      env: {
        PORT: 0,
        OPENAI_API_KEY: "test",
        OPENAI_MODEL: "gpt-5-mini",
        API_PROXY_SHARED_SECRET: "secret"
      }
    });

    const response = await handler(
      new Request("http://127.0.0.1/v1/control-plane/oauth-apps/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-proxy-secret": "secret",
          "x-pico-admin-email": "admin@pico.ai"
        },
        body: JSON.stringify({
          displayName: "Decision Tracker",
          appType: "provider",
          ownerOrgId: "picoai"
        })
      })
    );

    expect(response.status).toBe(201);

    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        app: expect.objectContaining({
          displayName: "Decision Tracker",
          appType: "provider"
        }),
        clientSecret: expect.any(String)
      })
    );
  });

  it("rejects control-plane requests without proxy secret", async () => {
    const handler = createAppHandler({
      aiProvider: new FakeProvider(),
      env: {
        PORT: 0,
        OPENAI_API_KEY: "test",
        OPENAI_MODEL: "gpt-5-mini",
        API_PROXY_SHARED_SECRET: "secret"
      }
    });

    const response = await handler(
      new Request("http://127.0.0.1/v1/control-plane/oauth-apps", {
        method: "GET"
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized." });
  });
});
