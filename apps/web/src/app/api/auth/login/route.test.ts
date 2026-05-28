import { afterEach, describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/auth/login", () => {
  afterEach(() => {
    delete process.env.AUTH_PROVIDER;
    delete process.env.AUTH_LOCAL_MODE;
    delete (process.env as Record<string, string | undefined>).NODE_ENV;
    delete process.env.ORY_KRATOS_PUBLIC_URL;
    delete process.env.APP_SESSION_SECRET;
    delete process.env.APP_IDENTITY_USERS_JSON;
  });

  it("rejects local credential login when hosted auth provider is enabled", async () => {
    process.env.AUTH_PROVIDER = "ory-kratos";
    process.env.ORY_KRATOS_PUBLIC_URL = "https://auth.pico.ai";

    const response = await POST(
      new Request("http://127.0.0.1:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "admin", password: "admin" })
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        error: "Local credential login is disabled for hosted identity mode."
      })
    );
  });

  it("rejects local credential login in production when not emergency mode", async () => {
    process.env.AUTH_PROVIDER = "local";
    process.env.AUTH_LOCAL_MODE = "development";
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.APP_SESSION_SECRET = "test-secret";
    process.env.APP_IDENTITY_USERS_JSON = JSON.stringify([
      {
        username: "admin",
        password: "admin",
        email: "admin@pico.ai",
        groups: ["picoai", "app_admin", "org_admin"]
      }
    ]);

    const response = await POST(
      new Request("http://127.0.0.1:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "admin", password: "admin" })
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        error: "Local credential login is disabled outside emergency fallback mode."
      })
    );
  });

  it("fails local login when APP_IDENTITY_USERS_JSON is missing", async () => {
    process.env.AUTH_PROVIDER = "local";
    process.env.AUTH_LOCAL_MODE = "emergency";
    process.env.APP_SESSION_SECRET = "test-secret";

    const response = await POST(
      new Request("http://127.0.0.1:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "admin", password: "admin" })
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        error: "Missing APP_IDENTITY_USERS_JSON."
      })
    );
  });
});
