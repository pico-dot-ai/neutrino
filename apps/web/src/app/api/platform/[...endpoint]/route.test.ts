import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

const requireAdminSessionMock = vi.fn();
const getProxyEnvMock = vi.fn();

vi.mock("@/lib/auth/request-auth", () => ({
  requireAdminSession: (...args: unknown[]) => requireAdminSessionMock(...args)
}));

vi.mock("@/lib/config", () => ({
  getProxyEnv: () => getProxyEnvMock()
}));

describe("/api/platform/[...endpoint]", () => {
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
    fetchMock.mockResolvedValue(Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("forwards GET requests with admin identity headers and groups", async () => {
    const response = await GET(
      new Request("http://127.0.0.1/api/platform/context?kind=pico.app"),
      { params: Promise.resolve({ endpoint: ["context"] }) }
    );
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("http://127.0.0.1:4000/v1/control-plane/context?kind=pico.app"),
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          "x-api-proxy-secret": "secret",
          "x-pico-admin-email": "admin@pico.ai",
          "x-pico-admin-actor-id": "local:admin",
          "x-pico-admin-groups": "picoai,app_admin"
        })
      })
    );
  });

  it("forwards POST body to control-plane endpoint", async () => {
    await POST(
      new Request("http://127.0.0.1/api/platform/manifests/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manifest: { kind: "pico.binding" } })
      }),
      { params: Promise.resolve({ endpoint: ["manifests", "register"] }) }
    );

    expect(fetchMock).toHaveBeenCalledWith(
      new URL("http://127.0.0.1:4000/v1/control-plane/manifests/register"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ manifest: { kind: "pico.binding" } })
      })
    );
  });
});
