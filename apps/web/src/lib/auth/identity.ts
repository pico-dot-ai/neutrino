import {
  createHostedIdentityProvider,
  createLocalIdentityProvider
} from "@neutrino/identity-gateway";
import type { IdentityProvider } from "@neutrino/ports";
import type { AuthenticatedActor } from "@neutrino/schema";
import { getAuthPolicyEnv, getLocalIdentityUsers } from "@/lib/config";

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

  return createHostedIdentityProvider({
    providerId: authEnv.ORY_KRATOS_PROVIDER_ID,
    protocol: authEnv.ORY_KRATOS_PROTOCOL,
    kratosPublicUrl: authEnv.ORY_KRATOS_PUBLIC_URL
  });
}
