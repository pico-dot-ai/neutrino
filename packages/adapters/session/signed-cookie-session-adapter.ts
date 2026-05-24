import type {
  AuthenticatedActor,
  AuthSession,
} from "@neutrino/schema";
import type { SessionManager } from "@neutrino/ports";

type SessionPayload = {
  sessionId: string;
  actor: AuthenticatedActor;
  issuedAt: string;
  expiresAt: string;
};

const encoder = new TextEncoder();

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function sign(payload: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return bytesToBase64Url(new Uint8Array(signature));
}

async function verify(payload: string, signature: string, secret: string) {
  const expected = await sign(payload, secret);
  return signature === expected;
}

export default class SignedCookieSessionAdapter implements SessionManager {
  constructor(private readonly secret: string) {}

  async issueSession(options: {
    actor: AuthenticatedActor;
    ttlSeconds: number;
  }): Promise<string> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + options.ttlSeconds * 1000);
    const payload: SessionPayload = {
      sessionId: crypto.randomUUID(),
      actor: options.actor,
      issuedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    };
    const encodedPayload = bytesToBase64Url(
      encoder.encode(JSON.stringify(payload))
    );
    const signature = await sign(encodedPayload, this.secret);
    return `${encodedPayload}.${signature}`;
  }

  async readSession(token: string): Promise<AuthSession | null> {
    const [encodedPayload, signature] = token.split(".");

    if (!encodedPayload || !signature) {
      return null;
    }

    if (!(await verify(encodedPayload, signature, this.secret))) {
      return null;
    }

    try {
      const payload = JSON.parse(
        new TextDecoder().decode(base64UrlToBytes(encodedPayload))
      ) as SessionPayload;

      if (Date.now() >= Date.parse(payload.expiresAt)) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  async revokeSession(_sessionId: string): Promise<void> {
    return;
  }
}
