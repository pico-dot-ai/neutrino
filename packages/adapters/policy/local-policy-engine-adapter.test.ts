import { describe, expect, it } from "vitest";
import type { PicoPolicyManifest } from "@neutrino/schema";
import LocalPolicyEngineAdapter from "./local-policy-engine-adapter";

const samplePolicy: PicoPolicyManifest = {
  kind: "pico.policy",
  metadata: { id: "policy-1", name: "sample" },
  rules: [
    { actor: "alice", action: "read", resource: "doc:1", effect: "allow" },
    { actor: "alice", action: "*", resource: "doc:secret", effect: "deny" },
    { actor: "*", action: "read", resource: "public:*", effect: "allow" }
  ]
};

describe("LocalPolicyEngineAdapter", () => {
  it("allows when an allow rule matches and no deny rule matches", async () => {
    const engine = new LocalPolicyEngineAdapter([samplePolicy]);
    const result = await engine.decide({
      actorId: "alice",
      action: "read",
      resource: "doc:1"
    });

    expect(result).toEqual({
      allowed: true,
      reason: "Allowed by local policy rule."
    });
  });

  it("denies when a matching deny rule exists, even with broader allow rules", async () => {
    const engine = new LocalPolicyEngineAdapter([samplePolicy]);
    const result = await engine.decide({
      actorId: "alice",
      action: "read",
      resource: "doc:secret"
    });

    expect(result).toEqual({
      allowed: false,
      reason: "Denied by local policy rule."
    });
  });

  it("denies when no allow rule matches", async () => {
    const engine = new LocalPolicyEngineAdapter([samplePolicy]);
    const result = await engine.decide({
      actorId: "bob",
      action: "write",
      resource: "doc:1"
    });

    expect(result).toEqual({
      allowed: false,
      reason: "No matching allow rule."
    });
  });
});
