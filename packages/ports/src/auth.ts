import type {
  AuthSession,
  IdentityPrincipal,
  IdentityProviderCapabilities,
  IdentityProtocol,
  PasswordAuthRequest,
  TokenValidationRequest
} from "@neutrino/schema";

export interface IdentityProvider {
  providerId: string;
  protocol: IdentityProtocol;
  capabilities: IdentityProviderCapabilities;
  authenticateWithPassword?(
    request: PasswordAuthRequest
  ): Promise<IdentityPrincipal | null>;
  validateToken?(
    request: TokenValidationRequest
  ): Promise<IdentityPrincipal | null>;
}

export interface SessionManager {
  issueSession(options: {
    principal: IdentityPrincipal;
    ttlSeconds: number;
  }): Promise<string>;
  readSession(token: string): Promise<AuthSession | null>;
  revokeSession(sessionId: string): Promise<void>;
}

export type PolicyDecisionRequest = {
  subject: string;
  action: string;
  resource: string;
  scope?: Record<string, string | undefined>;
};

export type PolicyDecision = {
  allowed: boolean;
  reason?: string;
};

export interface PolicyEngine {
  decide(request: PolicyDecisionRequest): Promise<PolicyDecision>;
}
