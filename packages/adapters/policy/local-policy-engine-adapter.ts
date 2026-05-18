import type { PicoPolicyManifest } from "@neutrino/schema";
import type { PolicyDecision, PolicyDecisionRequest, PolicyEngine } from "@neutrino/ports";

function matches(pattern: string, value: string) {
  return pattern === "*" || pattern === value;
}

export default class LocalPolicyEngineAdapter implements PolicyEngine {
  constructor(private readonly policies: PicoPolicyManifest[] = []) {}

  async decide(request: PolicyDecisionRequest): Promise<PolicyDecision> {
    const matchingRules = this.policies.flatMap((policy) =>
      policy.rules.filter(
        (rule) =>
          matches(rule.subject, request.subject) &&
          matches(rule.action, request.action) &&
          matches(rule.resource, request.resource)
      )
    );

    const deny = matchingRules.find((rule) => rule.effect === "deny");
    if (deny) {
      return {
        allowed: false,
        reason: "Denied by local policy rule."
      };
    }

    const allow = matchingRules.find((rule) => rule.effect === "allow");
    return allow
      ? {
          allowed: true,
          reason: "Allowed by local policy rule."
        }
      : {
          allowed: false,
          reason: "No matching allow rule."
        };
  }
}
