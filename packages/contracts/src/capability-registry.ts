export type CapabilityLifecycleState =
  | "draft"
  | "approved"
  | "published"
  | "deprecated";

export type CapabilityRecord = {
  capabilityId: string;
  name: string;
  version: string;
  ownerPicoAppId: string;
  description?: string;
  scopes: string[];
  limits: Record<string, string | number | boolean>;
  lifecycleState: CapabilityLifecycleState;
  internalOnly: boolean;
  createdAt: string;
  updatedAt: string;
  eolAt?: string;
};

export interface CapabilityRegistry {
  registerCapability(request: {
    name: string;
    version: string;
    ownerPicoAppId: string;
    description?: string;
    scopes?: string[];
    limits?: Record<string, string | number | boolean>;
  }): Promise<CapabilityRecord>;
  publishCapability(request: {
    capabilityId: string;
  }): Promise<CapabilityRecord>;
  deprecateCapability(request: {
    capabilityId: string;
    eolAt?: string;
  }): Promise<CapabilityRecord>;
  listCapabilities(): Promise<CapabilityRecord[]>;
}
