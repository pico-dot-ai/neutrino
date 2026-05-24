import type {
  AuthenticatedActor,
  PasswordAuthRequest
} from "@neutrino/schema";
import type { IdentityProvider } from "@neutrino/ports";

export type LocalIdentityUser = {
  username: string;
  password: string;
  email: string;
  groups: string[];
};

export default class LocalIdentityAdapter implements IdentityProvider {
  providerId: string;
  protocol = "local" as const;
  capabilities = {
    supportsPassword: true,
    supportsOidc: false,
    supportsSaml: false
  } as const;

  constructor(
    private readonly users: LocalIdentityUser[],
    options?: {
      providerId?: string;
    }
  ) {
    this.providerId = options?.providerId ?? "local-mvp";
  }

  async authenticateWithPassword(
    request: PasswordAuthRequest
  ): Promise<AuthenticatedActor | null> {
    const user = this.users.find(
      (candidate) => candidate.username === request.username
    );

    if (!user || user.password !== request.password) {
      return null;
    }

    return {
      actorId: `local:${user.username}`,
      username: user.username,
      email: user.email,
      groups: user.groups
    };
  }
}
