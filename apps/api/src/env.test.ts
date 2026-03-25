import { describe, expect, it } from "vitest";
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
});
