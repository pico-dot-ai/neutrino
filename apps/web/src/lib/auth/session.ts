import type { IdentityPrincipal } from "@neutrino/contracts";
import { createSignedCookieSessionStore } from "@neutrino/identity-gateway";
import { getAuthPolicyEnv } from "@/lib/config";
import { SESSION_COOKIE_NAME } from "./constants";

export async function issueAdminSession(principal: IdentityPrincipal) {
  const authEnv = getAuthPolicyEnv();
  const sessionStore = createSignedCookieSessionStore(authEnv.APP_SESSION_SECRET);
  return sessionStore.issueSession({
    principal,
    ttlSeconds: authEnv.APP_SESSION_TTL_SECONDS
  });
}

export async function readAdminSession(token: string | undefined | null) {
  if (!token) {
    return null;
  }

  const authEnv = getAuthPolicyEnv();
  const sessionStore = createSignedCookieSessionStore(authEnv.APP_SESSION_SECRET);
  return sessionStore.readSession(token);
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
