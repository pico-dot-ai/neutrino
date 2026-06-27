import { createHash } from "node:crypto";
import { z } from "zod";
import type { ApiEnv } from "./env";

type ActorRecord = {
  actorId: string;
  workspaceId: string;
  kind: "user" | "app" | "service" | "system";
  handle: string;
  displayName: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
};

type IdentityRecord = {
  identityId: string;
  workspaceId: string;
  provider: string;
  externalId: string;
  kind: "user" | "group";
  mapsToType: "actor" | "group";
  mapsToId: string;
  createdAt: string;
  updatedAt: string;
};

type GrantRecord = {
  grantId: string;
  workspaceId: string;
  granteeType: "actor" | "group";
  granteeId: string;
  relation: string;
  resourceType: string;
  resourceId: string;
  createdAt: string;
};

type AuditEventRecord = {
  auditEventId: string;
  workspaceId?: string;
  actorId?: string;
  action: string;
  resource: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

type AuthCore = {
  accessGraphRepository: {
    upsertActor(record: ActorRecord): Promise<ActorRecord>;
    getActor(actorId: string): Promise<ActorRecord | null>;
    listActors(filter?: {
      workspaceId?: string;
      kind?: ActorRecord["kind"];
    }): Promise<ActorRecord[]>;
    upsertIdentity(record: IdentityRecord): Promise<IdentityRecord>;
    listIdentities(filter?: {
      workspaceId?: string;
      provider?: string;
      mapsToType?: IdentityRecord["mapsToType"];
      mapsToId?: string;
      externalId?: string;
    }): Promise<IdentityRecord[]>;
    addGrant(record: GrantRecord): Promise<GrantRecord>;
    listGrants(filter?: {
      workspaceId?: string;
      granteeType?: "actor" | "group";
      granteeId?: string;
      relation?: string;
      resourceType?: string;
      resourceId?: string;
    }): Promise<GrantRecord[]>;
  };
  auditRepository: {
    writeEvent(record: AuditEventRecord): Promise<AuditEventRecord>;
    listEvents(filter?: {
      workspaceId?: string;
      actorId?: string;
      action?: string;
      resource?: string;
    }): Promise<AuditEventRecord[]>;
  };
};

type KratosIdentity = {
  id: string;
  state?: string;
  created_at?: string;
  updated_at?: string;
  schema_id?: string;
  traits?: {
    email?: string;
    username?: string;
    name?: {
      first?: string;
      last?: string;
    };
  };
};

export const syncAuthSessionSchema = z.object({
  actorId: z.string().min(1),
  email: z.string().email(),
  username: z.string().min(1),
  emailVerified: z.boolean(),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime()
});

export const inviteAuthUserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(1).optional(),
  displayName: z.string().min(1).optional()
});

function nowIso() {
  return new Date().toISOString();
}

function stableId(prefix: string, ...parts: string[]) {
  const hash = createHash("sha256").update(parts.join("\0")).digest("hex").slice(0, 24);
  return `${prefix}_${hash}`;
}

function parseCsvSet(value: string) {
  return new Set(
    value
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)
  );
}

function isAllowedEmail(env: ApiEnv, email: string) {
  const normalized = email.trim().toLowerCase();
  const exact = parseCsvSet(env.AUTH_SIGNUP_ALLOWED_EMAILS);
  const domains = parseCsvSet(env.AUTH_SIGNUP_ALLOWED_DOMAINS);

  if (exact.size === 0 && domains.size === 0) {
    return true;
  }

  if (exact.has(normalized)) {
    return true;
  }

  const domain = normalized.split("@")[1] ?? "";
  return domains.has(domain);
}

function actorIdFromKratosIdentity(identityId: string) {
  return `ory:${identityId}`;
}

function externalIdFromActorId(actorId: string) {
  return actorId.startsWith("ory:") ? actorId.slice(4) : actorId;
}

function identityRecordId(provider: string, externalId: string) {
  return stableId("identity", provider, externalId);
}

function defaultGrantId(workspaceId: string, actorId: string, relation: string) {
  return stableId("grant", workspaceId, actorId, relation, "workspace", workspaceId);
}

function userResource(actorId: string) {
  return `auth-user:${actorId}`;
}

function summarizeUser(options: {
  actor: ActorRecord;
  identities: IdentityRecord[];
  grants: GrantRecord[];
  audits: AuditEventRecord[];
  kratosState?: string;
}) {
  return {
    actor: options.actor,
    identities: options.identities,
    grants: options.grants,
    audit: options.audits,
    lifecycle: {
      hostedIdentityState: options.kratosState ?? "unknown",
      isManaged: options.identities.some((identity) => identity.provider === "ory-kratos")
    }
  };
}

async function recordAudit(
  core: AuthCore,
  workspaceId: string,
  actorId: string | undefined,
  action: string,
  resource: string,
  metadata?: Record<string, unknown>
) {
  await core.auditRepository.writeEvent({
    auditEventId: stableId("audit", workspaceId, actorId ?? "system", action, resource, nowIso()),
    workspaceId,
    ...(actorId ? { actorId } : {}),
    action,
    resource,
    ...(metadata ? { metadata } : {}),
    createdAt: nowIso()
  });
}

async function fetchJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as T | { error?: string } | null;
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload && payload.error
        ? payload.error
        : `Kratos request failed with ${response.status}.`;
    throw new Error(String(message));
  }
  return payload as T;
}

function createKratosAdminClient(env: ApiEnv, fetchImpl: typeof fetch) {
  const adminUrl = env.KRATOS_ADMIN_URL?.replace(/\/+$/, "");

  async function getIdentity(identityId: string) {
    if (!adminUrl) {
      return null;
    }
    const response = await fetchImpl(`${adminUrl}/admin/identities/${identityId}`, {
      method: "GET",
      headers: { Accept: "application/json" }
    });
    if (response.status === 404) {
      return null;
    }
    return fetchJson<KratosIdentity>(response);
  }

  return {
    enabled: Boolean(adminUrl),
    async createIdentity(input: { email: string; username?: string }) {
      if (!adminUrl) {
        throw new Error("KRATOS_ADMIN_URL is required for managed hosted-auth user lifecycle.");
      }
      const response = await fetchImpl(`${adminUrl}/admin/identities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schema_id: "default",
          state: "active",
          traits: {
            email: input.email,
            ...(input.username ? { username: input.username } : {})
          }
        })
      });
      return fetchJson<KratosIdentity>(response);
    },
    async getIdentity(identityId: string) {
      return getIdentity(identityId);
    },
    async setIdentityState(identityId: string, state: "active" | "inactive") {
      if (!adminUrl) {
        throw new Error("KRATOS_ADMIN_URL is required for managed hosted-auth user lifecycle.");
      }
      const current = await getIdentity(identityId);
      if (!current) {
        throw new Error(`Missing Kratos identity ${identityId}.`);
      }
      const response = await fetchImpl(`${adminUrl}/admin/identities/${identityId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...current,
          state,
          traits: {
            email: current.traits?.email,
            ...(current.traits?.username ? { username: current.traits.username } : {})
          }
        })
      });
      return fetchJson<KratosIdentity>(response);
    },
    async createRecoveryLink(identityId: string) {
      if (!adminUrl) {
        throw new Error("KRATOS_ADMIN_URL is required for managed hosted-auth password reset.");
      }
      const response = await fetchImpl(`${adminUrl}/admin/recovery/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity_id: identityId,
          expires_in: "1h"
        })
      });
      await fetchJson<Record<string, unknown>>(response);
    }
  };
}

export function createAuthControlPlane(options: {
  core: AuthCore;
  env: ApiEnv;
  fetchImpl?: typeof fetch;
}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const kratos = createKratosAdminClient(options.env, fetchImpl);
  const workspaceId = options.env.AUTH_DEFAULT_WORKSPACE_ID;

  async function ensureActorAndIdentity(input: {
    actorId: string;
    email: string;
    username: string;
    grantRelation?: string;
  }) {
    const timestamp = nowIso();
    const actor = await options.core.accessGraphRepository.upsertActor({
      actorId: input.actorId,
      workspaceId,
      kind: "user",
      handle: input.username,
      displayName: input.username,
      email: input.email,
      createdAt: timestamp,
      updatedAt: timestamp
    });
    const externalId = externalIdFromActorId(input.actorId);
    const identity = await options.core.accessGraphRepository.upsertIdentity({
      identityId: identityRecordId("ory-kratos", externalId),
      workspaceId,
      provider: "ory-kratos",
      externalId,
      kind: "user",
      mapsToType: "actor",
      mapsToId: input.actorId,
      createdAt: timestamp,
      updatedAt: timestamp
    });

    const existingGrants = await options.core.accessGraphRepository.listGrants({
      workspaceId,
      granteeType: "actor",
      granteeId: input.actorId
    });
    if (input.grantRelation && existingGrants.length === 0) {
      await options.core.accessGraphRepository.addGrant({
        grantId: defaultGrantId(workspaceId, input.actorId, input.grantRelation),
        workspaceId,
        granteeType: "actor",
        granteeId: input.actorId,
        relation: input.grantRelation,
        resourceType: "workspace",
        resourceId: workspaceId,
        createdAt: timestamp
      });
    }

    return { actor, identity };
  }

  async function getUser(actorId: string) {
    const actor = await options.core.accessGraphRepository.getActor(actorId);
    if (!actor) {
      return null;
    }
    const identities = await options.core.accessGraphRepository.listIdentities({
      workspaceId,
      mapsToType: "actor",
      mapsToId: actorId
    });
    const grants = await options.core.accessGraphRepository.listGrants({
      workspaceId,
      granteeType: "actor",
      granteeId: actorId
    });
    const audit = await options.core.auditRepository.listEvents({
      workspaceId,
      actorId
    });
    const hostedIdentity = identities.find((identity) => identity.provider === "ory-kratos");
    const kratosIdentity = hostedIdentity
      ? await kratos.getIdentity(hostedIdentity.externalId)
      : null;

    return summarizeUser({
      actor,
      identities,
      grants,
      audits: audit,
      kratosState: kratosIdentity?.state
    });
  }

  return {
    async syncSession(payload: z.infer<typeof syncAuthSessionSchema>) {
      if (!isAllowedEmail(options.env, payload.email)) {
        throw new Error("Your account is not eligible for Neutrino access.");
      }
      if (options.env.AUTH_REQUIRE_VERIFIED_EMAIL && !payload.emailVerified) {
        throw new Error("Verify your email before accessing Neutrino.");
      }

      const existing = await getUser(payload.actorId);
      const created = !existing;
      await ensureActorAndIdentity({
        actorId: payload.actorId,
        email: payload.email,
        username: payload.username,
        grantRelation: options.env.AUTH_INITIAL_GRANT_RELATION
      });
      await recordAudit(
        options.core,
        workspaceId,
        payload.actorId,
        created ? "auth.signup" : "auth.login",
        userResource(payload.actorId),
        {
          email: payload.email,
          emailVerified: payload.emailVerified
        }
      );

      return getUser(payload.actorId);
    },

    async listUsers() {
      const actors = await options.core.accessGraphRepository.listActors({
        workspaceId,
        kind: "user"
      });
      const users = await Promise.all(actors.map((actor) => getUser(actor.actorId)));
      return users.filter(Boolean);
    },

    async getUser(actorId: string) {
      return getUser(actorId);
    },

    async inviteUser(adminActorId: string | undefined, payload: z.infer<typeof inviteAuthUserSchema>) {
      if (!isAllowedEmail(options.env, payload.email)) {
        throw new Error("That email is outside the configured signup policy.");
      }

      const existingActors = await options.core.accessGraphRepository.listActors({
        workspaceId,
        kind: "user"
      });
      if (existingActors.some((actor) => actor.email?.toLowerCase() === payload.email.toLowerCase())) {
        throw new Error("A hosted identity for that account already exists.");
      }

      const kratosIdentity = await kratos.createIdentity({
        email: payload.email,
        username: payload.username ?? payload.email.split("@")[0]
      });
      const actorId = actorIdFromKratosIdentity(kratosIdentity.id);
      await ensureActorAndIdentity({
        actorId,
        email: payload.email,
        username: payload.username ?? payload.displayName ?? payload.email.split("@")[0],
        grantRelation: options.env.AUTH_INITIAL_GRANT_RELATION
      });
      await kratos.createRecoveryLink(kratosIdentity.id);
      await recordAudit(options.core, workspaceId, adminActorId, "auth.admin.invite", userResource(actorId), {
        targetActorId: actorId,
        email: payload.email
      });
      return getUser(actorId);
    },

    async setUserState(
      adminActorId: string | undefined,
      actorId: string,
      state: "active" | "inactive"
    ) {
      const user = await getUser(actorId);
      if (!user) {
        throw new Error("Unknown actor.");
      }
      const hostedIdentity = user.identities.find((identity) => identity.provider === "ory-kratos");
      if (!hostedIdentity) {
        throw new Error("Hosted identity linkage is missing.");
      }
      await kratos.setIdentityState(hostedIdentity.externalId, state);
      await recordAudit(
        options.core,
        workspaceId,
        adminActorId,
        state === "inactive" ? "auth.admin.disable" : "auth.admin.reactivate",
        userResource(actorId),
        { targetActorId: actorId }
      );
      return getUser(actorId);
    },

    async triggerPasswordReset(adminActorId: string | undefined, actorId: string) {
      const user = await getUser(actorId);
      if (!user) {
        throw new Error("Unknown actor.");
      }
      const hostedIdentity = user.identities.find((identity) => identity.provider === "ory-kratos");
      if (!hostedIdentity) {
        throw new Error("Hosted identity linkage is missing.");
      }
      await kratos.createRecoveryLink(hostedIdentity.externalId);
      await recordAudit(
        options.core,
        workspaceId,
        adminActorId,
        "auth.admin.password_reset",
        userResource(actorId),
        { targetActorId: actorId }
      );
      return { ok: true };
    }
  };
}
