import { describe, expect, it, vi } from "vitest";
import HostedIdentityProviderAdapter from "./hosted-identity-provider-adapter";

function createJsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init
  });
}

describe("HostedIdentityProviderAdapter", () => {
  it("maps a valid Kratos session into an authenticated actor", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      createJsonResponse({
        id: "session_123",
        active: true,
        authenticated_at: "2026-05-25T00:00:00.000Z",
        expires_at: "2026-05-25T08:00:00.000Z",
        identity: {
          id: "identity_123",
          traits: {
            email: "admin@pico.ai",
            username: "admin"
          }
        }
      })
    );

    const adapter = new HostedIdentityProviderAdapter({
      protocol: "oidc",
      kratosPublicUrl: "https://kratos.example.com",
      fetchImpl
    });

    const session = await adapter.validateBrowserSession({
      cookieHeader: "ory_kratos_session=abc"
    });

    expect(session).toEqual({
      sessionId: "session_123",
      issuedAt: "2026-05-25T00:00:00.000Z",
      expiresAt: "2026-05-25T08:00:00.000Z",
      actor: {
        actorId: "ory:identity_123",
        username: "admin",
        email: "admin@pico.ai",
        groups: []
      }
    });
  });

  it("returns null for unauthenticated status", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
    const adapter = new HostedIdentityProviderAdapter({
      protocol: "oidc",
      kratosPublicUrl: "https://kratos.example.com",
      fetchImpl
    });

    await expect(
      adapter.validateBrowserSession({ cookieHeader: "ory_kratos_session=abc" })
    ).resolves.toBeNull();
  });

  it("returns null for malformed payload", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(createJsonResponse({ active: true }));
    const adapter = new HostedIdentityProviderAdapter({
      protocol: "saml",
      kratosPublicUrl: "https://kratos.example.com",
      fetchImpl
    });

    await expect(
      adapter.validateBrowserSession({ cookieHeader: "ory_kratos_session=abc" })
    ).resolves.toBeNull();
  });

  it("does not map metadata_public.groups into Neutrino authorization", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      createJsonResponse({
        id: "session_456",
        active: true,
        authenticated_at: "2026-05-25T00:00:00.000Z",
        expires_at: "2026-05-25T08:00:00.000Z",
        identity: {
          id: "identity_456",
          traits: {
            email: "dev@pico.ai",
            username: "dev-user"
          },
          metadata_public: {
            groups: ["picoai", "app_developer"]
          }
        }
      })
    );

    const adapter = new HostedIdentityProviderAdapter({
      protocol: "oidc",
      kratosPublicUrl: "https://kratos.example.com",
      fetchImpl
    });

    const session = await adapter.validateBrowserSession({
      cookieHeader: "ory_kratos_session=def"
    });

    expect(session?.actor.groups).toEqual([]);
  });

  it("does not map traits.groups into Neutrino authorization", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      createJsonResponse({
        id: "session_789",
        active: true,
        authenticated_at: "2026-05-25T00:00:00.000Z",
        expires_at: "2026-05-25T08:00:00.000Z",
        identity: {
          id: "identity_789",
          traits: {
            email: "dev2@pico.ai",
            username: "dev2",
            groups: ["user_supplied_group"]
          }
        }
      })
    );

    const adapter = new HostedIdentityProviderAdapter({
      protocol: "oidc",
      kratosPublicUrl: "https://kratos.example.com",
      fetchImpl
    });

    const session = await adapter.validateBrowserSession({
      cookieHeader: "ory_kratos_session=ghi"
    });

    expect(session?.actor.groups).toEqual([]);
  });
});
