import { describe, expect, it, vi } from "vitest";
import { loadEnv } from "./env";

describe("loadEnv", () => {
  it("applies defaults and validates required values", () => {
    const env = loadEnv({
      OPENAI_API_KEY: "test-key",
      API_PROXY_SHARED_SECRET: "secret"
    });

    expect(env.PORT).toBe(4000);
    expect(env.OPENAI_MODEL).toBe("gpt-5-mini");
  });

  it("logs missing required environment variables", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => loadEnv({})).toThrow();
    expect(spy).toHaveBeenCalledWith(
      "Missing required environment variables: OPENAI_API_KEY, API_PROXY_SHARED_SECRET"
    );

    spy.mockRestore();
  });
});
