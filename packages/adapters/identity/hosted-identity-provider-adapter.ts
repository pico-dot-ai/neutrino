import type { IdentityProvider } from "@neutrino/ports";
import type { AuthSession } from "@neutrino/schema";

type KratosWhoAmIResponse = {
  id?: string;
  active?: boolean;
  expires_at?: string;
  authenticated_at?: string;
  identity?: {
    id?: string;
    traits?: {
      email?: string;
      username?: string;
      name?: {
        first?: string;
        last?: string;
      };
      [key: string]: unknown;
    };
    metadata_public?: {
      groups?: unknown;
      [key: string]: unknown;
    };
  };
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

export default class HostedIdentityProviderAdapter implements IdentityProvider {
  providerId: string;
  protocol: "oidc" | "saml";
  capabilities = {
    supportsPassword: false,
    supportsOidc: true,
    supportsSaml: true
  } as const;

  private readonly whoamiUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: {
    providerId?: string;
    protocol: "oidc" | "saml";
    kratosPublicUrl: string;
    fetchImpl?: typeof fetch;
  }) {
    this.providerId = options.providerId ?? "ory-kratos";
    this.protocol = options.protocol;
    this.whoamiUrl = new URL(
      "/sessions/whoami",
      options.kratosPublicUrl.replace(/\/+$/, "")
    ).toString();
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async validateBrowserSession(request: {
    cookieHeader: string | null;
  }): Promise<AuthSession | null> {
    if (!request.cookieHeader) {
      return null;
    }

    const response = await this.fetchImpl(this.whoamiUrl, {
      method: "GET",
      headers: {
        cookie: request.cookieHeader
      },
      cache: "no-store"
    });

    if (response.status === 401 || response.status === 403) {
      return null;
    }

    if (!response.ok) {
      return null;
    }

    let payload: KratosWhoAmIResponse;
    try {
      payload = (await response.json()) as KratosWhoAmIResponse;
    } catch {
      return null;
    }

    const identityId = payload.identity?.id;
    const email = payload.identity?.traits?.email;
    const issuedAt = payload.authenticated_at;
    const expiresAt = payload.expires_at;
    const groups = asStringArray(payload.identity?.metadata_public?.groups);
    const usernameFromTraits = payload.identity?.traits?.username;
    const first = payload.identity?.traits?.name?.first;
    const last = payload.identity?.traits?.name?.last;
    const fallbackName = [first, last].filter(Boolean).join(" ").trim();
    const username = (usernameFromTraits ?? fallbackName) || email;

    if (!payload.active || !identityId || !email || !issuedAt || !expiresAt || !username) {
      return null;
    }

    return {
      sessionId: payload.id ?? `ory:${identityId}`,
      issuedAt,
      expiresAt,
      actor: {
        actorId: `ory:${identityId}`,
        username,
        email,
        groups
      }
    };
  }
}
