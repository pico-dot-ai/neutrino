import type {
  IdentityPrincipal,
  IdentityProviderConnector,
  PasswordAuthRequest
} from "../../contracts/src/identity-provider";

export type LocalIdentityUser = {
  username: string;
  password: string;
  email: string;
  orgMemberships: string[];
  roles: string[];
};

export default class LocalIdentityAdapter implements IdentityProviderConnector {
  connectorId: string;
  protocol = "local" as const;
  capabilities = {
    supportsPassword: true,
    supportsOidc: false,
    supportsSaml: false
  } as const;

  constructor(
    private readonly users: LocalIdentityUser[],
    options?: {
      connectorId?: string;
    }
  ) {
    this.connectorId = options?.connectorId ?? "local-mvp";
  }

  async authenticateWithPassword(
    request: PasswordAuthRequest
  ): Promise<IdentityPrincipal | null> {
    const user = this.users.find(
      (candidate) => candidate.username === request.username
    );

    if (!user || user.password !== request.password) {
      return null;
    }

    return {
      subject: `local:${user.username}`,
      username: user.username,
      email: user.email,
      orgMemberships: user.orgMemberships,
      roles: user.roles
    };
  }
}
