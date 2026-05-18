import type { CapabilityRecord, OAuthAppRecord } from "@neutrino/schema";

export interface CapabilityCatalog {
  registerCapability(request: {
    name: string;
    version: string;
    ownerAppId: string;
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

export interface OAuthClientCatalog {
  registerOAuthApp(request: {
    displayName: string;
    description?: string;
    appType: "consumer" | "provider" | "both";
    ownerOrgId: string;
    redirectUris?: string[];
    allowedScopes?: string[];
    supportedGrantModes?: Array<"client_credentials" | "authorization_code_pkce">;
  }): Promise<{ app: OAuthAppRecord; clientSecret: string }>;
  updateOAuthApp(request: {
    app_id: string;
    displayName?: string;
    description?: string;
    redirectUris?: string[];
    allowedScopes?: string[];
    appType?: "consumer" | "provider" | "both";
  }): Promise<OAuthAppRecord>;
  rotateCredential(request: {
    app_id: string;
  }): Promise<{ app_id: string; clientSecret: string; updatedAt: string }>;
  revokeCredential(request: { app_id: string }): Promise<OAuthAppRecord>;
  approveProductionActivation(request: {
    app_id: string;
  }): Promise<OAuthAppRecord>;
  assignAppAdmin(request: {
    app_id: string;
    email: string;
  }): Promise<OAuthAppRecord>;
  listOAuthApps(): Promise<OAuthAppRecord[]>;
}
