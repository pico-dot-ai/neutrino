import { describe, expect, it } from "vitest";
import {
  devAgentManifest,
  devAgentAppManifest,
  devAgentHarnessManifest,
  devAgentLocalBindingManifest,
  devAgentServiceManifest,
  devAgentSkillManifest
} from "../dev-agent/manifests";
import { validatePlatformManifest } from "./manifest";

describe("validatePlatformManifest", () => {
  it("accepts the Dev agent manifest set", () => {
    expect(validatePlatformManifest(devAgentAppManifest)).toBe(devAgentAppManifest);
    expect(validatePlatformManifest(devAgentServiceManifest)).toBe(devAgentServiceManifest);
    expect(validatePlatformManifest(devAgentSkillManifest)).toBe(devAgentSkillManifest);
    expect(validatePlatformManifest(devAgentHarnessManifest)).toBe(devAgentHarnessManifest);
    expect(validatePlatformManifest(devAgentManifest)).toBe(devAgentManifest);
    expect(validatePlatformManifest(devAgentLocalBindingManifest)).toBe(devAgentLocalBindingManifest);
  });

  it("rejects manifests without a positive version", () => {
    expect(() =>
      validatePlatformManifest({
        ...devAgentAppManifest,
        version: 0
      })
    ).toThrow(/positive integer version/);
  });

  it("rejects app actions without a handler or versioned service", () => {
    expect(() =>
      validatePlatformManifest({
        ...devAgentAppManifest,
        actions: {
          invalid_action: {
            input: "./schemas/input.json"
          }
        }
      })
    ).toThrow(/handler or uses/);
  });

  it("rejects app actions that use unversioned services", () => {
    expect(() =>
      validatePlatformManifest({
        ...devAgentAppManifest,
        actions: {
          invalid_action: {
            uses: "@pico/dev-agent-service"
          }
        }
      })
    ).toThrow(/versioned service/);
  });

  it("rejects services without package-style identity and schemas", () => {
    expect(() =>
      validatePlatformManifest({
        ...devAgentServiceManifest,
        packageName: "pico.dev-agent-service"
      })
    ).toThrow(/package-style identity/);

    expect(() =>
      validatePlatformManifest({
        ...devAgentServiceManifest,
        schema: {
          input: "./schemas/input.json"
        }
      })
    ).toThrow(/schema.output/);
  });
});
