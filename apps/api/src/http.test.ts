import { describe, expect, it } from "vitest";
import type { LanguageModelProvider } from "@neutrino/ports";
import type { GenerateRequest, GenerateResponse } from "@neutrino/schema";
import { createAppHandler } from "./http";
import type { ApiEnv } from "./env";

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

function createTestEnv(overrides: Partial<ApiEnv> = {}): ApiEnv {
  return {
    PORT: 0,
    OPENAI_API_KEY: "test",
    OPENAI_MODEL: "gpt-5-mini",
    API_PROXY_SHARED_SECRET: "secret",
    AUTH_SIGNUP_ALLOWED_EMAILS: "",
    AUTH_SIGNUP_ALLOWED_DOMAINS: "",
    AUTH_REQUIRE_VERIFIED_EMAIL: true,
    AUTH_DEFAULT_WORKSPACE_ID: "workspace_picoai",
    AUTH_INITIAL_GRANT_RELATION: "can_manage",
    ...overrides
  };
}

describe("createHttpServer", () => {
  it("returns health status", async () => {
    const handler = createAppHandler({
      aiProvider: new FakeProvider(),
      env: createTestEnv()
    });

    const response = await handler(new Request("http://127.0.0.1/health"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("streams chat events when authorized", async () => {
    const handler = createAppHandler({
      aiProvider: new FakeProvider(),
      env: createTestEnv()
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
      env: createTestEnv()
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
      env: createTestEnv()
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
      env: createTestEnv()
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
      env: createTestEnv()
    });

    const response = await handler(
      new Request("http://127.0.0.1/v1/control-plane/runtime/runs", {
        method: "GET"
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized." });
  });

  it("syncs hosted auth sessions and exposes managed users through control-plane auth endpoints", async () => {
    const handler = createAppHandler({
      aiProvider: new FakeProvider(),
      env: {
        PORT: 0,
        OPENAI_API_KEY: "test",
        OPENAI_MODEL: "gpt-5-mini",
        API_PROXY_SHARED_SECRET: "secret",
        AUTH_DEFAULT_WORKSPACE_ID: "workspace_picoai",
        AUTH_INITIAL_GRANT_RELATION: "can_manage",
        AUTH_SIGNUP_ALLOWED_EMAILS: "",
        AUTH_SIGNUP_ALLOWED_DOMAINS: "",
        AUTH_REQUIRE_VERIFIED_EMAIL: true
      }
    });

    const syncResponse = await handler(
      new Request("http://127.0.0.1/v1/auth/session/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-proxy-secret": "secret"
        },
        body: JSON.stringify({
          actorId: "ory:user_1",
          email: "user1@pico.ai",
          username: "user1",
          emailVerified: true,
          issuedAt: "2026-01-01T00:00:00.000Z",
          expiresAt: "2026-01-01T08:00:00.000Z"
        })
      })
    );

    expect(syncResponse.status).toBe(200);

    const usersResponse = await handler(
      new Request("http://127.0.0.1/v1/control-plane/auth/users", {
        method: "GET",
        headers: {
          "x-api-proxy-secret": "secret",
          "x-pico-admin-email": "admin@pico.ai",
          "x-pico-admin-actor-id": "local:admin"
        }
      })
    );

    expect(usersResponse.status).toBe(200);
    await expect(usersResponse.json()).resolves.toEqual({
      users: expect.arrayContaining([
        expect.objectContaining({
          actor: expect.objectContaining({
            actorId: "ory:user_1",
            email: "user1@pico.ai"
          }),
          identities: expect.arrayContaining([
            expect.objectContaining({
              provider: "ory-kratos",
              externalId: "user_1"
            })
          ]),
          grants: expect.arrayContaining([
            expect.objectContaining({
              relation: "can_manage",
              resourceType: "workspace",
              resourceId: "workspace_picoai"
            })
          ])
        })
      ])
    });
  });

  it("captures failed runtime runs with runtime.failed traces", async () => {
    const handler = createAppHandler({
      aiProvider: new FailingProvider(),
      env: createTestEnv()
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
      env: createTestEnv()
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
      env: createTestEnv()
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
      env: createTestEnv()
    });

    const response = await handler(
      new Request("http://127.0.0.1/v1/control-plane/manifests", {
        method: "GET"
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized." });
  });

  it("registers manifests, lists app/service/binding inventory, and invokes an app action", async () => {
    const handler = createAppHandler({
      aiProvider: new FakeProvider(),
      env: createTestEnv()
    });

    const contextResponse = await handler(
      new Request("http://127.0.0.1/v1/control-plane/context", {
        headers: {
          "x-api-proxy-secret": "secret",
          "x-pico-admin-email": "admin@pico.ai",
          "x-pico-admin-actor-id": "local:admin"
        }
      })
    );
    expect(contextResponse.status).toBe(200);
    await expect(contextResponse.json()).resolves.toEqual(
      expect.objectContaining({
        scope: {
          workspaceId: "workspace_picoai",
          projectId: "project_dev_agent"
        },
        actor: {
          actorId: "local:admin",
          email: "admin@pico.ai"
        }
      })
    );

    const appResponse = await handler(
      new Request("http://127.0.0.1/v1/control-plane/apps", {
        headers: {
          "x-api-proxy-secret": "secret",
          "x-pico-admin-email": "admin@pico.ai"
        }
      })
    );
    expect(appResponse.status).toBe(200);
    await expect(appResponse.json()).resolves.toEqual(
      expect.objectContaining({
        apps: expect.arrayContaining([
          expect.objectContaining({
            id: "pico.dev-agent",
            actions: expect.arrayContaining([
              expect.objectContaining({
                actionId: "generate_reply",
                uses: "@pico/dev-agent-service@1.0.0"
              })
            ])
          })
        ])
      })
    );

    const serviceResponse = await handler(
      new Request("http://127.0.0.1/v1/control-plane/services", {
        headers: {
          "x-api-proxy-secret": "secret",
          "x-pico-admin-email": "admin@pico.ai"
        }
      })
    );
    expect(serviceResponse.status).toBe(200);
    await expect(serviceResponse.json()).resolves.toEqual(
      expect.objectContaining({
        services: expect.arrayContaining([
          expect.objectContaining({
            serviceId: "pico.service.dev-agent"
          })
        ])
      })
    );

    const bindingResponse = await handler(
      new Request("http://127.0.0.1/v1/control-plane/bindings", {
        headers: {
          "x-api-proxy-secret": "secret",
          "x-pico-admin-email": "admin@pico.ai"
        }
      })
    );
    expect(bindingResponse.status).toBe(200);
    await expect(bindingResponse.json()).resolves.toEqual(
      expect.objectContaining({
        bindings: expect.arrayContaining([
          expect.objectContaining({
            requirement: "languageModel",
            provider: "openai"
          })
        ])
      })
    );

    const invokeResponse = await handler(
      new Request("http://127.0.0.1/v1/apps/pico.dev-agent/actions/generate_reply/invoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-proxy-secret": "secret",
          "x-pico-admin-email": "admin@pico.ai",
          "x-pico-admin-actor-id": "local:admin"
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Run action" }]
        })
      })
    );
    expect(invokeResponse.status).toBe(200);
    await expect(invokeResponse.json()).resolves.toEqual(
      expect.objectContaining({
        run: expect.objectContaining({
          status: "succeeded",
          appId: "pico.dev-agent",
          actionId: "generate_reply",
          actorId: "local:admin",
          servicePackageName: "@pico/dev-agent-service",
          serviceVersion: 1,
          bindingSnapshotId: "pico.binding.dev-agent.local"
        }),
        memory: expect.objectContaining({
          kind: "action_output",
          content: "generated with gpt-5-mini"
        }),
        artifact: expect.objectContaining({
          objectUri: expect.stringContaining("local-object://runs/"),
          checksum: expect.any(String)
        })
      })
    );
  });

  it("allows app action invocation for any authenticated actor", async () => {
    const handler = createAppHandler({
      aiProvider: new FakeProvider(),
      env: createTestEnv()
    });

    const response = await handler(
      new Request("http://127.0.0.1/v1/apps/pico.dev-agent/actions/generate_reply/invoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-proxy-secret": "secret",
          "x-pico-admin-email": "admin@pico.ai",
          "x-pico-admin-actor-id": "local:someone-else"
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Run action" }]
        })
      })
    );

    expect(response.status).toBe(200);
  });

  it("registers binding manifests through control-plane endpoint", async () => {
    const handler = createAppHandler({
      aiProvider: new FakeProvider(),
      env: createTestEnv()
    });

    const response = await handler(
      new Request("http://127.0.0.1/v1/control-plane/bindings/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-proxy-secret": "secret",
          "x-pico-admin-email": "admin@pico.ai",
          "x-pico-admin-actor-id": "local:admin"
        },
        body: JSON.stringify({
          manifest: {
            kind: "pico.binding",
            version: 1,
            id: "pico.binding.test",
            environment: "local",
            bindings: {
              languageModel: {
                provider: "openai",
                model: "gpt-test"
              }
            }
          }
        })
      })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        bindings: [
          expect.objectContaining({
            requirement: "languageModel",
            model: "gpt-test"
          })
        ]
      })
    );
  });

  it("registers an OAuth app through control-plane endpoint", async () => {
    const handler = createAppHandler({
      aiProvider: new FakeProvider(),
      env: createTestEnv()
    });

    const response = await handler(
      new Request("http://127.0.0.1/v1/control-plane/oauth-apps/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-proxy-secret": "secret",
          "x-pico-admin-email": "admin@pico.ai",
          "x-pico-admin-actor-id": "local:admin"
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

  it("allows control-plane writes for any authenticated actor", async () => {
    const handler = createAppHandler({
      aiProvider: new FakeProvider(),
      env: createTestEnv()
    });

    const response = await handler(
      new Request("http://127.0.0.1/v1/control-plane/manifests/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-proxy-secret": "secret",
          "x-pico-admin-email": "admin@pico.ai",
          "x-pico-admin-actor-id": "local:someone-else"
        },
        body: JSON.stringify({
          manifest: {
            kind: "pico.binding",
            version: 1,
            id: "pico.binding.authenticated",
            environment: "local",
            bindings: {
              languageModel: {
                provider: "openai",
                model: "gpt-test"
              }
            }
          }
        })
      })
    );

    expect(response.status).toBe(201);
  });

  it("rejects control-plane requests without proxy secret", async () => {
    const handler = createAppHandler({
      aiProvider: new FakeProvider(),
      env: createTestEnv()
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
