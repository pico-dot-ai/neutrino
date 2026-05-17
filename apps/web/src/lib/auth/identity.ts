import { createLocalIdentityConnector } from "@neutrino/identity-gateway";
import type { IdentityPrincipal } from "@neutrino/contracts";
import { getLocalIdentityUsers } from "@/lib/config";

export async function authenticateLocalIdentity(request: {
  username: string;
  password: string;
}): Promise<IdentityPrincipal | null> {
  const connector = createLocalIdentityConnector({
    connectorId: "neutrino-local-mvp",
    users: getLocalIdentityUsers()
  });

  return connector.authenticateWithPassword?.(request) ?? null;
}
