import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { POST } from "./route";

const requireAdminSessionMock = vi.fn();
const getProxyEnvMock = vi.fn();

vi.mock("@/lib/auth/request-auth", () => ({
  requireAdminSession: (...args: unknown[]) => requireAdminSessionMock(...args)
}));

vi.mock("@/lib/config", () => ({
  getProxyEnv: () => getProxyEnvMock()
}));

function createSseResponse() {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode('data: {"type":"done","text":"ok"}\n\n')
        );
        controller.close();
      }
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8"
      }
    }
  );
}

describe("POST /api/chat", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    requireAdminSessionMock.mockResolvedValue({
      ok: true,
      session: {
        actor: {
          actorId: "local:admin",
          email: "admin@pico.ai"
        }
      }
    });
    getProxyEnvMock.mockReturnValue({
      API_BASE_URL: "http://127.0.0.1:4000",
      API_PROXY_SHARED_SECRET: "secret"
    });
    fetchMock.mockResolvedValue(createSseResponse());
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("forwards optional runtime selection payload", async () => {
    const response = await POST(
      new Request("http://127.0.0.1/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
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

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:4000/v1/chat",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"runtime":{"workspaceId":"workspace_picoai"')
      })
    );
  });
});
