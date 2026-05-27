import { afterEach, describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/auth/login/start", () => {
  afterEach(() => {
    delete process.env.AUTH_PROVIDER;
    delete process.env.ORY_KRATOS_PUBLIC_URL;
    delete process.env.ORY_KRATOS_BROWSER_LOGIN_PATH;
    delete process.env.APP_SESSION_SECRET;
  });

  it("redirects to local login when local auth provider is enabled", async () => {
    process.env.AUTH_PROVIDER = "local";
    process.env.APP_SESSION_SECRET = "test-secret";

    const response = await GET(
      new Request("http://127.0.0.1:3000/api/auth/login/start?next=%2Fadmin")
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://127.0.0.1:3000/login?next=%2Fadmin");
  });

  it("redirects to Kratos browser login in hosted mode", async () => {
    process.env.AUTH_PROVIDER = "ory-kratos";
    process.env.ORY_KRATOS_PUBLIC_URL = "https://kratos.example.com";

    const response = await GET(
      new Request("http://127.0.0.1:3000/api/auth/login/start?next=%2Fadmin")
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://kratos.example.com/self-service/login/browser?return_to=http%3A%2F%2F127.0.0.1%3A3000%2Fadmin"
    );
  });
});
