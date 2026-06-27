import type { SessionManager } from "@neutrino/ports";
import LocalIdentityAdapter, {
  type LocalIdentityUser
} from "../../adapters/identity/local-identity-adapter.ts";
import HostedIdentityProviderAdapter from "../../adapters/identity/hosted-identity-provider-adapter.ts";
import SignedCookieSessionAdapter from "../../adapters/session/signed-cookie-session-adapter.ts";

export function createLocalIdentityProvider(options: {
  users: LocalIdentityUser[];
  providerId?: string;
}) {
  return new LocalIdentityAdapter(options.users, {
    providerId: options.providerId
  });
}

export function createSignedCookieSessionManager(secret: string): SessionManager {
  return new SignedCookieSessionAdapter(secret);
}

export function createHostedIdentityProvider(options: {
  providerId?: string;
  protocol: "oidc" | "saml";
  kratosPublicUrl: string;
  requireVerifiedEmail?: boolean;
  onSessionValidated?: (
    session: import("@neutrino/schema").AuthSession,
    context: { externalId: string; emailVerified: boolean }
  ) => Promise<void>;
  fetchImpl?: typeof fetch;
}) {
  return new HostedIdentityProviderAdapter(options);
}

export type { LocalIdentityUser };
