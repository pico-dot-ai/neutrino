import type { OAuthAppRecord } from "@neutrino/schema";
import type { OAuthClientCatalog } from "@neutrino/ports";

const defaultGrantModes = ["client_credentials", "authorization_code_pkce"] as const;

function nowIso() {
  return new Date().toISOString();
}

function generateAppId() {
  return `app_${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}`;
}

function generateClientId() {
  return `client_${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}`;
}

function generateClientSecret() {
  return `secret_${crypto.randomUUID().replace(/-/g, "")}`;
}

export default class InMemoryOAuthClientCatalogAdapter implements OAuthClientCatalog {
  private readonly apps = new Map<string, OAuthAppRecord>();
  private readonly secrets = new Map<string, string>();

  async registerOAuthApp(request: {
    displayName: string;
    description?: string;
    appType: "consumer" | "provider" | "both";
    ownerOrgId: string;
    redirectUris?: string[];
    allowedScopes?: string[];
    supportedGrantModes?: ("client_credentials" | "authorization_code_pkce")[];
  }) {
    const createdAt = nowIso();
    const app: OAuthAppRecord = {
      app_id: generateAppId(),
      displayName: request.displayName,
      description: request.description,
      appType: request.appType,
      ownerOrgId: request.ownerOrgId,
      status: "draft",
      productionApproved: false,
      redirectUris: request.redirectUris ?? [],
      allowedScopes: request.allowedScopes ?? [],
      supportedGrantModes: request.supportedGrantModes ?? [...defaultGrantModes],
      assignedAdminEmails: [],
      clientId: generateClientId(),
      createdAt,
      updatedAt: createdAt
    };
    const clientSecret = generateClientSecret();

    this.apps.set(app.app_id, app);
    this.secrets.set(app.app_id, clientSecret);

    return { app, clientSecret };
  }

  async updateOAuthApp(request: {
    app_id: string;
    displayName?: string;
    description?: string;
    redirectUris?: string[];
    allowedScopes?: string[];
    appType?: "consumer" | "provider" | "both";
  }) {
    const app = this.mustGet(request.app_id);
    const updated: OAuthAppRecord = {
      ...app,
      displayName: request.displayName ?? app.displayName,
      description: request.description ?? app.description,
      redirectUris: request.redirectUris ?? app.redirectUris,
      allowedScopes: request.allowedScopes ?? app.allowedScopes,
      appType: request.appType ?? app.appType,
      updatedAt: nowIso()
    };
    this.apps.set(updated.app_id, updated);
    return updated;
  }

  async rotateCredential(request: { app_id: string }) {
    const app = this.mustGet(request.app_id);
    const secret = generateClientSecret();
    const updatedAt = nowIso();

    this.secrets.set(app.app_id, secret);
    this.apps.set(app.app_id, {
      ...app,
      updatedAt
    });

    return {
      app_id: app.app_id,
      clientSecret: secret,
      updatedAt
    };
  }

  async revokeCredential(request: { app_id: string }) {
    const app = this.mustGet(request.app_id);
    const updated: OAuthAppRecord = {
      ...app,
      status: "disabled",
      updatedAt: nowIso()
    };

    this.apps.set(app.app_id, updated);
    this.secrets.delete(app.app_id);
    return updated;
  }

  async approveProductionActivation(request: { app_id: string }) {
    const app = this.mustGet(request.app_id);
    const updated: OAuthAppRecord = {
      ...app,
      productionApproved: true,
      status: "approved",
      updatedAt: nowIso()
    };

    this.apps.set(app.app_id, updated);
    return updated;
  }

  async assignAppAdmin(request: { app_id: string; email: string }) {
    const app = this.mustGet(request.app_id);
    const assignedAdminEmails = Array.from(
      new Set([...app.assignedAdminEmails, request.email])
    );
    const updated: OAuthAppRecord = {
      ...app,
      assignedAdminEmails,
      updatedAt: nowIso()
    };
    this.apps.set(app.app_id, updated);
    return updated;
  }

  async listOAuthApps() {
    return Array.from(this.apps.values()).sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt)
    );
  }

  private mustGet(appId: string) {
    const app = this.apps.get(appId);
    if (!app) {
      throw new Error(`OAuth app "${appId}" not found.`);
    }
    return app;
  }
}
