import { createLocalIdentityProvider } from "@neutrino/identity-gateway";
import type { AuthenticatedActor } from "@neutrino/schema";
import { getLocalIdentityUsers } from "@/lib/config";

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
