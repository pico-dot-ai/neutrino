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

describe("POST /api/apps/[appId]/actions/[actionId]/invoke", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    requireAdminSessionMock.mockResolvedValue({
      ok: true,
      session: {
        actor: {
          actorId: "local:admin",
          email: "admin@pico.ai",
          groups: ["picoai", "app_admin"]
        }
      }
    });
    getProxyEnvMock.mockReturnValue({
      API_BASE_URL: "http://127.0.0.1:4000",
      API_PROXY_SHARED_SECRET: "secret"
    });
    fetchMock.mockResolvedValue(
      Response.json({
        run: {
          runId: "run_1",
          status: "succeeded"
        }
      })
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("forwards action invocation with the authenticated actor", async () => {
    const response = await POST(
      new Request("http://127.0.0.1/api/apps/pico.dev-agent/actions/generate_reply/invoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hello" }]
        })
      }),
      {
        params: Promise.resolve({
          appId: "pico.dev-agent",
          actionId: "generate_reply"
        })
      }
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:4000/v1/apps/pico.dev-agent/actions/generate_reply/invoke",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-api-proxy-secret": "secret",
          "x-pico-admin-email": "admin@pico.ai",
          "x-pico-admin-actor-id": "local:admin",
          "x-pico-admin-groups": "picoai,app_admin"
        })
      })
    );
  });
});
