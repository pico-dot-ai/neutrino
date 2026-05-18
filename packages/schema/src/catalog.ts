export type LifecycleState = "draft" | "approved" | "published" | "deprecated";

export type CapabilityRecord = {
  capabilityId: string;
  name: string;
  version: string;
  ownerAppId: string;
  description?: string;
  scopes: string[];
  limits: Record<string, string | number | boolean>;
  lifecycleState: LifecycleState;
  internalOnly: boolean;
  createdAt: string;
  updatedAt: string;
  eolAt?: string;
};

export type OAuthGrantMode = "client_credentials" | "authorization_code_pkce";

export type OAuthAppType = "consumer" | "provider" | "both";

export type OAuthAppStatus = "draft" | "approved" | "disabled";

export type OAuthAppRecord = {
  app_id: string;
  displayName: string;
  description?: string;
  appType: OAuthAppType;
  ownerOrgId: string;
  status: OAuthAppStatus;
  productionApproved: boolean;
  redirectUris: string[];
  supportedGrantModes: OAuthGrantMode[];
  allowedScopes: string[];
  assignedAdminEmails: string[];
  clientId: string;
  createdAt: string;
  updatedAt: string;
};
