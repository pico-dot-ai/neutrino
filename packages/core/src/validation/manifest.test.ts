import { describe, expect, it } from "vitest";
import { devAgentAppManifest } from "../dev-agent/manifests";
import { validatePlatformManifest } from "./manifest";

describe("validatePlatformManifest", () => {
  it("accepts the Dev agent app manifest", () => {
    expect(validatePlatformManifest(devAgentAppManifest)).toBe(devAgentAppManifest);
  });

  it("rejects manifests without a positive version", () => {
    expect(() =>
      validatePlatformManifest({
        ...devAgentAppManifest,
        version: 0
      })
    ).toThrow(/positive integer version/);
  });
});
