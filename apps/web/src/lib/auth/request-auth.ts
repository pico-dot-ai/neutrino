import { getAuthPolicyEnv } from "@/lib/config";
import { isEligibleAdminPrincipal } from "./policy";
import { parseSessionCookie, readAdminSession } from "./session";

export async function getAdminSessionFromCookieHeader(cookieHeader: string | null) {
  const { APP_AUTH_ENABLED } = getAuthPolicyEnv();
  if (!APP_AUTH_ENABLED) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
    return {
      sessionId: "auth-disabled",
      issuedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      principal: {
        subject: "local:auth-disabled",
        username: "auth-disabled",
        email: "admin@pico.ai",
        orgMemberships: ["picoai"],
        roles: ["app_admin", "org_admin"]
      }
    };
  }

  const token = parseSessionCookie(cookieHeader);
  if (!token) {
    return null;
  }

  return readAdminSession(token);
}

export async function requireAdminSession(cookieHeader: string | null) {
  const session = await getAdminSessionFromCookieHeader(cookieHeader);

  if (!session) {
    return {
      ok: false as const,
      status: 401,
      error: "Authentication required."
    };
  }

  if (!isEligibleAdminPrincipal(session.principal)) {
    return {
      ok: false as const,
      status: 403,
      error: "App admin privileges are required."
    };
  }

  return {
    ok: true as const,
    session
  };
}
