import type {
  OAuthAppRecord,
  OAuthRegistry
} from "../../contracts/src/oauth-registry";

const defaultGrantModes = ["client_credentials", "authorization_code_pkce"] as const;

function nowIso() {
  return new Date().toISOString();
}

function generatePicoAppId() {
  return `pico_app_${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}`;
}

function generateClientId() {
  return `pico_client_${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}`;
}

function generateClientSecret() {
  return `pico_secret_${crypto.randomUUID().replace(/-/g, "")}`;
}

export default class InMemoryOAuthRegistryAdapter implements OAuthRegistry {
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
      pico_app_id: generatePicoAppId(),
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

    this.apps.set(app.pico_app_id, app);
    this.secrets.set(app.pico_app_id, clientSecret);

    return { app, clientSecret };
  }

  async updateOAuthApp(request: {
    pico_app_id: string;
    displayName?: string;
    description?: string;
    redirectUris?: string[];
    allowedScopes?: string[];
    appType?: "consumer" | "provider" | "both";
  }) {
    const app = this.mustGet(request.pico_app_id);
    const updated: OAuthAppRecord = {
      ...app,
      displayName: request.displayName ?? app.displayName,
      description: request.description ?? app.description,
      redirectUris: request.redirectUris ?? app.redirectUris,
      allowedScopes: request.allowedScopes ?? app.allowedScopes,
      appType: request.appType ?? app.appType,
      updatedAt: nowIso()
    };
    this.apps.set(updated.pico_app_id, updated);
    return updated;
  }

  async rotateCredential(request: { pico_app_id: string }) {
    const app = this.mustGet(request.pico_app_id);
    const secret = generateClientSecret();
    const updatedAt = nowIso();

    this.secrets.set(app.pico_app_id, secret);
    this.apps.set(app.pico_app_id, {
      ...app,
      updatedAt
    });

    return {
      pico_app_id: app.pico_app_id,
      clientSecret: secret,
      updatedAt
    };
  }

  async revokeCredential(request: { pico_app_id: string }) {
    const app = this.mustGet(request.pico_app_id);
    const updated: OAuthAppRecord = {
      ...app,
      status: "disabled",
      updatedAt: nowIso()
    };

    this.apps.set(app.pico_app_id, updated);
    this.secrets.delete(app.pico_app_id);
    return updated;
  }

  async approveProductionActivation(request: { pico_app_id: string }) {
    const app = this.mustGet(request.pico_app_id);
    const updated: OAuthAppRecord = {
      ...app,
      productionApproved: true,
      status: "approved",
      updatedAt: nowIso()
    };

    this.apps.set(app.pico_app_id, updated);
    return updated;
  }

  async assignAppAdmin(request: { pico_app_id: string; email: string }) {
    const app = this.mustGet(request.pico_app_id);
    const assignedAdminEmails = Array.from(
      new Set([...app.assignedAdminEmails, request.email])
    );
    const updated: OAuthAppRecord = {
      ...app,
      assignedAdminEmails,
      updatedAt: nowIso()
    };
    this.apps.set(app.pico_app_id, updated);
    return updated;
  }

  async listOAuthApps() {
    return Array.from(this.apps.values()).sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt)
    );
  }

  private mustGet(picoAppId: string) {
    const app = this.apps.get(picoAppId);
    if (!app) {
      throw new Error(`OAuth app "${picoAppId}" not found.`);
    }
    return app;
  }
}
