import { getAuthPolicyEnv } from "@/lib/config";
import { isEligibleAdminActor } from "./policy";
import { readAdminSessionFromCookieHeader } from "./session";

export async function getAdminSessionFromCookieHeader(cookieHeader: string | null) {
  const { APP_AUTH_ENABLED } = getAuthPolicyEnv();
  if (!APP_AUTH_ENABLED) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
    return {
      sessionId: "auth-disabled",
      issuedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      actor: {
        actorId: "local:auth-disabled",
        username: "auth-disabled",
        email: "admin@pico.ai",
        groups: ["picoai", "app_admin", "org_admin"]
      }
    };
  }

  return readAdminSessionFromCookieHeader(cookieHeader);
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

  if (!isEligibleAdminActor(session.actor)) {
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
