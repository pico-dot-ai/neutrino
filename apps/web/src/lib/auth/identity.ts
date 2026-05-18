import { createLocalIdentityProvider } from "@neutrino/identity-gateway";
import type { IdentityPrincipal } from "@neutrino/schema";
import { getLocalIdentityUsers } from "@/lib/config";

export async function authenticateLocalIdentity(request: {
  username: string;
  password: string;
}): Promise<IdentityPrincipal | null> {
  const provider = createLocalIdentityProvider({
    providerId: "neutrino-local-mvp",
    users: getLocalIdentityUsers()
  });

  return provider.authenticateWithPassword?.(request) ?? null;
}
