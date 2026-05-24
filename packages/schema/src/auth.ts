export type IdentityProtocol = "local" | "oidc" | "saml";

export type IdentityProviderCapabilities = {
  supportsPassword: boolean;
  supportsOidc: boolean;
  supportsSaml: boolean;
};

export type AuthenticatedActor = {
  actorId: string;
  username: string;
  email: string;
  groups: string[];
};

export type PasswordAuthRequest = {
  username: string;
  password: string;
};

export type TokenValidationRequest = {
  token: string;
  protocol: Exclude<IdentityProtocol, "local">;
};

export type AuthSession = {
  sessionId: string;
  actor: AuthenticatedActor;
  issuedAt: string;
  expiresAt: string;
};
