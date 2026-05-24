import { describe, expect, it } from "vitest";
import type { LanguageModelProvider } from "@neutrino/ports";
import type { GenerateRequest, GenerateResponse } from "@neutrino/schema";
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

class FailingProvider implements LanguageModelProvider {
  generate(_request: GenerateRequest): Promise<GenerateResponse> {
    return Promise.reject(new Error("Model provider failed."));
  }

  async *stream() {
    throw new Error("Model provider failed.");
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

  it("supports explicit runtime selection on chat requests", async () => {
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
          runtime: {
            workspaceId: "workspace_picoai",
            projectId: "project_dev_agent",
            agentId: "pico.dev-agent.agent"
          },
          messages: [{ role: "user", content: "Hello" }]
        })
      })
    );

    const text = await response.text();
    expect(response.status).toBe(200);
    expect(text).toContain('"type":"done"');
  });

  it("returns SSE error when runtime selection cannot resolve", async () => {
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
          runtime: {
            workspaceId: "workspace_picoai",
            projectId: "project_dev_agent",
            agentId: "pico.dev-agent.missing"
          },
          messages: [{ role: "user", content: "Hello" }]
        })
      })
    );

    const text = await response.text();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(text).toContain("Unable to resolve agent manifest");
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
        scope: {
          workspaceId: "workspace_picoai",
          projectId: "project_dev_agent"
        },
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
            provider: "language-model",
            runId: expect.any(String),
            model: "gpt-5-mini"
          })
        ]
      })
    );
  });

  it("returns unauthorized for runtime run readback without proxy secret", async () => {
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
      new Request("http://127.0.0.1/v1/control-plane/runtime/runs", {
        method: "GET"
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized." });
  });

  it("captures failed runtime runs with runtime.failed traces", async () => {
    const handler = createAppHandler({
      aiProvider: new FailingProvider(),
      env: {
        PORT: 0,
        OPENAI_API_KEY: "test",
        OPENAI_MODEL: "gpt-5-mini",
        API_PROXY_SHARED_SECRET: "secret"
      }
    });

    const chatResponse = await handler(
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

    const chatText = await chatResponse.text();
    expect(chatResponse.status).toBe(200);
    expect(chatText).toContain('"type":"error"');
    expect(chatText).toContain("Model provider failed");

    const runtimeResponse = await handler(
      new Request("http://127.0.0.1/v1/control-plane/runtime/runs", {
        method: "GET",
        headers: {
          "x-api-proxy-secret": "secret",
          "x-pico-admin-email": "admin@pico.ai"
        }
      })
    );
    await expect(runtimeResponse.json()).resolves.toEqual(
      expect.objectContaining({
        runs: expect.arrayContaining([
          expect.objectContaining({
            run: expect.objectContaining({
              status: "failed",
              error: "Model provider failed."
            }),
            traces: expect.arrayContaining([
              expect.objectContaining({
                eventType: "runtime.failed"
              })
            ])
          })
        ])
      })
    );
  });

  it("lists manifest records through authorized control-plane endpoint", async () => {
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
      new Request("http://127.0.0.1/v1/control-plane/manifests", {
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
        manifests: expect.arrayContaining([
          expect.objectContaining({
            kind: "pico.agent",
            resourceId: "pico.dev-agent.agent"
          })
        ])
      })
    );
  });

  it("filters manifests by kind and resourceId", async () => {
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
      new Request(
        "http://127.0.0.1/v1/control-plane/manifests?kind=pico.agent&resourceId=pico.dev-agent.agent",
        {
          method: "GET",
          headers: {
            "x-api-proxy-secret": "secret",
            "x-pico-admin-email": "admin@pico.ai"
          }
        }
      )
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      manifests: [
        expect.objectContaining({
          kind: "pico.agent",
          resourceId: "pico.dev-agent.agent"
        })
      ]
    });
  });

  it("rejects manifest endpoint requests without proxy secret", async () => {
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
      new Request("http://127.0.0.1/v1/control-plane/manifests", {
        method: "GET"
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized." });
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
