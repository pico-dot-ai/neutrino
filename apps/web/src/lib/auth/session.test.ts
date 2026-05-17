import { afterEach, describe, expect, it } from "vitest";
import { issueAdminSession, readAdminSession } from "./session";

describe("admin session", () => {
  afterEach(() => {
    delete process.env.APP_SESSION_SECRET;
    delete process.env.APP_SESSION_TTL_SECONDS;
  });

  it("issues and validates a signed session token", async () => {
    process.env.APP_SESSION_SECRET = "test-session-secret";
    process.env.APP_SESSION_TTL_SECONDS = "3600";

    const token = await issueAdminSession({
      subject: "local:admin",
      username: "admin",
      email: "admin@pico.ai",
      orgMemberships: ["picoai"],
      roles: ["app_admin"]
    });

    const session = await readAdminSession(token);
    expect(session).toEqual(
      expect.objectContaining({
        principal: expect.objectContaining({
          email: "admin@pico.ai"
        })
      })
    );
  });

  it("rejects tampered session token", async () => {
    process.env.APP_SESSION_SECRET = "test-session-secret";

    const token = await issueAdminSession({
      subject: "local:admin",
      username: "admin",
      email: "admin@pico.ai",
      orgMemberships: ["picoai"],
      roles: ["app_admin"]
    });

    const tampered = `${token.slice(0, -1)}x`;
    await expect(readAdminSession(tampered)).resolves.toBeNull();
  });
});
