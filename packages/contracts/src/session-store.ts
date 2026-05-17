import type { IdentityPrincipal } from "./identity-provider";

export type AuthSession = {
  sessionId: string;
  principal: IdentityPrincipal;
  issuedAt: string;
  expiresAt: string;
};

export interface SessionStore {
  issueSession(options: {
    principal: IdentityPrincipal;
    ttlSeconds: number;
  }): Promise<string>;
  readSession(token: string): Promise<AuthSession | null>;
  revokeSession(_sessionId: string): Promise<void>;
}
