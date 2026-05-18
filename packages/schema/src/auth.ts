export type IdentityProtocol = "local" | "oidc" | "saml";

export type IdentityProviderCapabilities = {
  supportsPassword: boolean;
  supportsOidc: boolean;
  supportsSaml: boolean;
};

export type IdentityPrincipal = {
  subject: string;
  username: string;
  email: string;
  orgMemberships: string[];
  roles: string[];
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
  principal: IdentityPrincipal;
  issuedAt: string;
  expiresAt: string;
};
