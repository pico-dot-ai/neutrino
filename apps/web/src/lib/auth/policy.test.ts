import { describe, expect, it } from "vitest";
import type { IdentityPrincipal } from "@neutrino/contracts";
import { isEligibleAdminPrincipal } from "./policy";

function basePrincipal(overrides?: Partial<IdentityPrincipal>): IdentityPrincipal {
  return {
    subject: "local:admin",
    username: "admin",
    email: "admin@pico.ai",
    orgMemberships: ["picoai"],
    roles: ["app_admin"],
    ...overrides
  };
}

describe("isEligibleAdminPrincipal", () => {
  it("accepts principal with role, org membership, and domain", () => {
    expect(isEligibleAdminPrincipal(basePrincipal())).toBe(true);
  });

  it("rejects principal without app_admin role", () => {
    expect(
      isEligibleAdminPrincipal(
        basePrincipal({
          roles: ["viewer"]
        })
      )
    ).toBe(false);
  });

  it("rejects principal outside pico.ai domain", () => {
    expect(
      isEligibleAdminPrincipal(
        basePrincipal({
          email: "admin@example.com"
        })
      )
    ).toBe(false);
  });
});
