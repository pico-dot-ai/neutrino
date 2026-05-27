import { afterEach, describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/auth/logout", () => {
  afterEach(() => {
    delete process.env.AUTH_PROVIDER;
    delete process.env.ORY_KRATOS_PUBLIC_URL;
    delete process.env.APP_SESSION_SECRET;
  });

  it("returns Kratos logout URL header when hosted auth is enabled", async () => {
    process.env.AUTH_PROVIDER = "ory-kratos";
    process.env.ORY_KRATOS_PUBLIC_URL = "https://kratos.example.com";

    const response = await POST(
      new Request("http://127.0.0.1:3000/api/auth/logout", { method: "POST" })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-neutrino-logout-url")).toBe(
      "https://kratos.example.com/self-service/logout/browser?return_to=http%3A%2F%2F127.0.0.1%3A3000%2Flogin"
    );
  });
});
