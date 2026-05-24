import { describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "@neutrino/schema";
import { isEligibleAdminActor } from "./policy";

function baseActor(overrides?: Partial<AuthenticatedActor>): AuthenticatedActor {
  return {
    actorId: "local:admin",
    username: "admin",
    email: "admin@pico.ai",
    groups: ["picoai", "app_admin"],
    ...overrides
  };
}

describe("isEligibleAdminActor", () => {
  it("accepts actor with admin group, org group, and domain", () => {
    expect(isEligibleAdminActor(baseActor())).toBe(true);
  });

  it("rejects actor without app_admin group", () => {
    expect(
      isEligibleAdminActor(
        baseActor({
          groups: ["picoai", "viewer"]
        })
      )
    ).toBe(false);
  });

  it("rejects actor outside pico.ai domain", () => {
    expect(
      isEligibleAdminActor(
        baseActor({
          email: "admin@example.com"
        })
      )
    ).toBe(false);
  });
});
