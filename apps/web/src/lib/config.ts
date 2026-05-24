import { z } from "zod";
import type { LocalIdentityUser } from "@neutrino/identity-gateway";

const proxyEnvSchema = z.object({
  API_BASE_URL: z
    .string()
    .url()
    .transform((value) => value.replace(/\/+$/, ""))
    .default("http://127.0.0.1:4000"),
  API_PROXY_SHARED_SECRET: z.string().min(1)
});

const authPolicyEnvSchema = z.object({
  APP_SESSION_SECRET: z.string().min(1),
  APP_SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 8),
  APP_AUTH_ENABLED: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value !== "false")
});

const localIdentityUserSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  email: z.string().email(),
  groups: z.array(z.string().min(1)).min(1)
});

const localIdentityUsersSchema = z.array(localIdentityUserSchema).min(1);

export function getProxyEnv() {
  return proxyEnvSchema.parse({
    API_BASE_URL: process.env.API_BASE_URL,
    API_PROXY_SHARED_SECRET: process.env.API_PROXY_SHARED_SECRET
  });
}

export function getAuthPolicyEnv() {
  const fallbackSessionSecret =
    process.env.NODE_ENV === "production"
      ? undefined
      : "dev-session-secret-change-me";

  return authPolicyEnvSchema.parse({
    APP_SESSION_SECRET: process.env.APP_SESSION_SECRET ?? fallbackSessionSecret,
    APP_SESSION_TTL_SECONDS: process.env.APP_SESSION_TTL_SECONDS,
    APP_AUTH_ENABLED: process.env.APP_AUTH_ENABLED
  });
}

export function getLocalIdentityUsers(): LocalIdentityUser[] {
  const raw = process.env.APP_IDENTITY_USERS_JSON;
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Missing APP_IDENTITY_USERS_JSON.");
    }

    return [
      {
        username: "admin",
        password: "admin",
        email: "admin@pico.ai",
        groups: ["picoai", "app_admin", "org_admin"]
      }
    ];
  }

  const parsed = JSON.parse(raw) as unknown;
  return localIdentityUsersSchema.parse(parsed);
}

export function getSecurityContext() {
  return {
    ...getAuthPolicyEnv(),
    localIdentityUsers: getLocalIdentityUsers()
  };
}

export function getRuntimeMetadata() {
  return {
    DEFAULT_OWNER_ORG_ID: process.env.DEFAULT_OWNER_ORG_ID ?? "picoai",
    DEFAULT_ENVIRONMENT: process.env.DEFAULT_ENVIRONMENT ?? "dev",
    INTERNAL_ONLY_CAPABILITIES: process.env.INTERNAL_ONLY_CAPABILITIES !== "false"
  };
}
