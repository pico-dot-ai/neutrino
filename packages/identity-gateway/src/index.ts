import type { SessionManager } from "@neutrino/ports";
import LocalIdentityAdapter, {
  type LocalIdentityUser
} from "../../adapters/identity/local-identity-adapter.ts";
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

export type { LocalIdentityUser };
