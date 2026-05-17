import InMemoryCapabilityRegistryAdapter from "../../adapters/control-plane/in-memory-capability-registry-adapter.ts";
import InMemoryOAuthRegistryAdapter from "../../adapters/control-plane/in-memory-oauth-registry-adapter.ts";

export type UsageMetric = {
  key: string;
  count: number;
  lastSeenAt: string;
};

class InMemoryUsageLedger {
  private readonly metrics = new Map<string, UsageMetric>();

  track(key: string) {
    const current = this.metrics.get(key);
    if (!current) {
      this.metrics.set(key, {
        key,
        count: 1,
        lastSeenAt: new Date().toISOString()
      });
      return;
    }

    this.metrics.set(key, {
      key,
      count: current.count + 1,
      lastSeenAt: new Date().toISOString()
    });
  }

  list() {
    return Array.from(this.metrics.values()).sort((a, b) =>
      a.key.localeCompare(b.key)
    );
  }
}

export function createPlatformControlPlane() {
  return {
    oauthRegistry: new InMemoryOAuthRegistryAdapter(),
    capabilityRegistry: new InMemoryCapabilityRegistryAdapter(),
    usageLedger: new InMemoryUsageLedger()
  };
}
