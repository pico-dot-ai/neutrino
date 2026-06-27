import { afterEach, describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/auth/verification/start", () => {
  afterEach(() => {
    delete process.env.AUTH_PROVIDER;
    delete process.env.ORY_KRATOS_PUBLIC_URL;
    delete process.env.ORY_KRATOS_BROWSER_VERIFICATION_PATH;
    delete process.env.APP_SESSION_SECRET;
  });

  it("redirects to Kratos browser verification in hosted mode", async () => {
    process.env.AUTH_PROVIDER = "ory-kratos";
    process.env.ORY_KRATOS_PUBLIC_URL = "https://kratos.example.com";

    const response = await GET(
      new Request("http://127.0.0.1:3000/api/auth/verification/start")
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://kratos.example.com/self-service/verification/browser"
    );
  });
});
