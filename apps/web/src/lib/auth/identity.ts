import {
  createHostedIdentityProvider,
  createLocalIdentityProvider
} from "@neutrino/identity-gateway";
import type { IdentityProvider } from "@neutrino/ports";
import type { AuthenticatedActor } from "@neutrino/schema";
import { getAuthPolicyEnv, getLocalIdentityUsers, getProxyEnv } from "@/lib/config";

export async function authenticateLocalIdentity(request: {
  username: string;
  password: string;
}): Promise<AuthenticatedActor | null> {
  const provider = createLocalIdentityProvider({
    providerId: "neutrino-local-mvp",
    users: getLocalIdentityUsers()
  });

  return provider.authenticateWithPassword?.(request) ?? null;
}

export function getIdentityProvider(): IdentityProvider {
  const authEnv = getAuthPolicyEnv();

  if (authEnv.AUTH_PROVIDER === "local") {
    return createLocalIdentityProvider({
      providerId: "neutrino-local-mvp",
      users: getLocalIdentityUsers()
    });
  }

  if (!authEnv.ORY_KRATOS_PUBLIC_URL) {
    throw new Error("Missing ORY_KRATOS_PUBLIC_URL for hosted identity provider.");
  }

  const proxyEnv = getProxyEnv();

  return createHostedIdentityProvider({
    providerId: authEnv.ORY_KRATOS_PROVIDER_ID,
    protocol: authEnv.ORY_KRATOS_PROTOCOL,
    kratosPublicUrl: authEnv.ORY_KRATOS_PUBLIC_URL,
    requireVerifiedEmail: authEnv.AUTH_REQUIRE_VERIFIED_EMAIL,
    async onSessionValidated(session, context) {
      const response = await fetch(`${proxyEnv.API_BASE_URL}/v1/auth/session/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-proxy-secret": proxyEnv.API_PROXY_SHARED_SECRET
        },
        body: JSON.stringify({
          actorId: session.actor.actorId,
          email: session.actor.email,
          username: session.actor.username,
          emailVerified: context.emailVerified,
          issuedAt: session.issuedAt,
          expiresAt: session.expiresAt
        }),
        cache: "no-store"
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Unable to sync hosted auth session.");
      }
    }
  });
}
