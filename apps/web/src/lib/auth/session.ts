import type { AuthenticatedActor } from "@neutrino/schema";
import { createSignedCookieSessionManager } from "@neutrino/identity-gateway";
import { getAuthPolicyEnv } from "@/lib/config";
import { getIdentityProvider } from "./identity";
import { SESSION_COOKIE_NAME } from "./constants";

export async function issueAdminSession(actor: AuthenticatedActor) {
  const authEnv = getAuthPolicyEnv();
  if (!authEnv.APP_SESSION_SECRET) {
    throw new Error("Missing APP_SESSION_SECRET for local identity session issuance.");
  }
  const sessionManager = createSignedCookieSessionManager(authEnv.APP_SESSION_SECRET);
  return sessionManager.issueSession({
    actor,
    ttlSeconds: authEnv.APP_SESSION_TTL_SECONDS
  });
}

export async function readAdminSession(token: string | undefined | null) {
  if (!token) {
    return null;
  }

  const authEnv = getAuthPolicyEnv();
  if (!authEnv.APP_SESSION_SECRET) {
    return null;
  }
  const sessionManager = createSignedCookieSessionManager(authEnv.APP_SESSION_SECRET);
  return sessionManager.readSession(token);
}

export async function readAdminSessionFromCookieHeader(cookieHeader: string | null) {
  const authEnv = getAuthPolicyEnv();

  if (authEnv.AUTH_PROVIDER === "local") {
    const token = parseSessionCookie(cookieHeader);
    if (!token) {
      return null;
    }
    return readAdminSession(token);
  }

  const provider = getIdentityProvider();
  return provider.validateBrowserSession?.({ cookieHeader }) ?? null;
}

export function parseSessionCookie(cookieHeader: string | null) {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").map((part) => part.trim());
  const sessionPair = cookies.find((cookie) =>
    cookie.startsWith(`${SESSION_COOKIE_NAME}=`)
  );

  if (!sessionPair) {
    return null;
  }

  return decodeURIComponent(sessionPair.slice(`${SESSION_COOKIE_NAME}=`.length));
}
