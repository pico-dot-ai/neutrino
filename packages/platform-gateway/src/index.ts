import InMemoryCapabilityCatalogAdapter from "../../adapters/control-plane/in-memory-capability-catalog-adapter.ts";
import InMemoryOAuthClientCatalogAdapter from "../../adapters/control-plane/in-memory-oauth-client-catalog-adapter.ts";

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
    oauthClientCatalog: new InMemoryOAuthClientCatalogAdapter(),
    capabilityCatalog: new InMemoryCapabilityCatalogAdapter(),
    usageLedger: new InMemoryUsageLedger()
  };
}
