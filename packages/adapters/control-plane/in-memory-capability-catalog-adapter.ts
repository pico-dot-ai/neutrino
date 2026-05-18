import type { CapabilityRecord } from "@neutrino/schema";
import type { CapabilityCatalog } from "@neutrino/ports";

function nowIso() {
  return new Date().toISOString();
}

function toCapabilityId(ownerAppId: string, name: string, version: string) {
  const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const safeVersion = version.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
  return `${ownerAppId}:${safeName}:${safeVersion}`;
}

export default class InMemoryCapabilityCatalogAdapter implements CapabilityCatalog {
  private readonly capabilities = new Map<string, CapabilityRecord>();

  async registerCapability(request: {
    name: string;
    version: string;
    ownerAppId: string;
    description?: string;
    scopes?: string[];
    limits?: Record<string, string | number | boolean>;
  }) {
    const capabilityId = toCapabilityId(
      request.ownerAppId,
      request.name,
      request.version
    );
    const timestamp = nowIso();
    const capability: CapabilityRecord = {
      capabilityId,
      name: request.name,
      version: request.version,
      ownerAppId: request.ownerAppId,
      description: request.description,
      scopes: request.scopes ?? [],
      limits: request.limits ?? {},
      lifecycleState: "draft",
      internalOnly: true,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    this.capabilities.set(capabilityId, capability);
    return capability;
  }

  async publishCapability(request: { capabilityId: string }) {
    const capability = this.mustGet(request.capabilityId);
    const updated: CapabilityRecord = {
      ...capability,
      lifecycleState: "published",
      updatedAt: nowIso()
    };

    this.capabilities.set(updated.capabilityId, updated);
    return updated;
  }

  async deprecateCapability(request: { capabilityId: string; eolAt?: string }) {
    const capability = this.mustGet(request.capabilityId);
    const updated: CapabilityRecord = {
      ...capability,
      lifecycleState: "deprecated",
      eolAt: request.eolAt,
      updatedAt: nowIso()
    };

    this.capabilities.set(updated.capabilityId, updated);
    return updated;
  }

  async listCapabilities() {
    return Array.from(this.capabilities.values()).sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt)
    );
  }

  private mustGet(capabilityId: string) {
    const capability = this.capabilities.get(capabilityId);
    if (!capability) {
      throw new Error(`Capability "${capabilityId}" not found.`);
    }
    return capability;
  }
}
