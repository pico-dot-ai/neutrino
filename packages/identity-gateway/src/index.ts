import type { SessionStore } from "@neutrino/contracts";
import LocalIdentityAdapter, {
  type LocalIdentityUser
} from "../../adapters/identity/local-identity-adapter.ts";
import SignedCookieSessionAdapter from "../../adapters/session/signed-cookie-session-adapter.ts";

export function createLocalIdentityConnector(options: {
  users: LocalIdentityUser[];
  connectorId?: string;
}) {
  return new LocalIdentityAdapter(options.users, {
    connectorId: options.connectorId
  });
}

export function createSignedCookieSessionStore(secret: string): SessionStore {
  return new SignedCookieSessionAdapter(secret);
}

export type { LocalIdentityUser };
