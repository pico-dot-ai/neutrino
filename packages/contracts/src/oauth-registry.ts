export type OAuthGrantMode = "client_credentials" | "authorization_code_pkce";

export type OAuthAppType = "consumer" | "provider" | "both";

export type OAuthAppStatus = "draft" | "approved" | "disabled";

export type OAuthAppRecord = {
  pico_app_id: string;
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

export interface OAuthRegistry {
  registerOAuthApp(request: {
    displayName: string;
    description?: string;
    appType: OAuthAppType;
    ownerOrgId: string;
    redirectUris?: string[];
    allowedScopes?: string[];
    supportedGrantModes?: OAuthGrantMode[];
  }): Promise<{ app: OAuthAppRecord; clientSecret: string }>;
  updateOAuthApp(request: {
    pico_app_id: string;
    displayName?: string;
    description?: string;
    redirectUris?: string[];
    allowedScopes?: string[];
    appType?: OAuthAppType;
  }): Promise<OAuthAppRecord>;
  rotateCredential(request: {
    pico_app_id: string;
  }): Promise<{ pico_app_id: string; clientSecret: string; updatedAt: string }>;
  revokeCredential(request: { pico_app_id: string }): Promise<OAuthAppRecord>;
  approveProductionActivation(request: {
    pico_app_id: string;
  }): Promise<OAuthAppRecord>;
  assignAppAdmin(request: {
    pico_app_id: string;
    email: string;
  }): Promise<OAuthAppRecord>;
  listOAuthApps(): Promise<OAuthAppRecord[]>;
}
