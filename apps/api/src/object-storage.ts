import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { ObjectMetadata, ObjectStorage, ObjectWriteRequest } from "@neutrino/ports";
import type { ApiEnv } from "./env";

const LOCAL_PREFIX = "local-object://";
const GCS_PREFIX = "gcs://";

class LocalObjectStorage implements ObjectStorage {
  constructor(private readonly rootDir: string) {}

  async writeObject(request: ObjectWriteRequest): Promise<ObjectMetadata> {
    const safeKey = request.key.replace(/^\/+/, "");
    const absolutePath = path.join(this.rootDir, safeKey);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, request.body);

    return {
      uri: `${LOCAL_PREFIX}${safeKey}`,
      key: safeKey,
      contentType: request.contentType,
      sizeBytes: request.body.byteLength
    };
  }

  async readObject(uri: string): Promise<Uint8Array | null> {
    const key = uri.startsWith(LOCAL_PREFIX) ? uri.slice(LOCAL_PREFIX.length) : null;
    if (!key) {
      return null;
    }

    try {
      return await fs.readFile(path.join(this.rootDir, key));
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  async deleteObject(uri: string): Promise<void> {
    const key = uri.startsWith(LOCAL_PREFIX) ? uri.slice(LOCAL_PREFIX.length) : null;
    if (!key) {
      return;
    }
    await fs.rm(path.join(this.rootDir, key), { force: true });
  }
}

class GcsObjectStorage implements ObjectStorage {
  constructor(
    private readonly bucketName: string,
    private readonly prefix: string
  ) {}

  async writeObject(request: ObjectWriteRequest): Promise<ObjectMetadata> {
    const storageModule = await import("@google-cloud/storage");
    const storage = new storageModule.Storage();
    const bucket = storage.bucket(this.bucketName);
    const safeKey = request.key.replace(/^\/+/, "");
    const objectKey = [this.prefix, safeKey].filter(Boolean).join("/");
    const file = bucket.file(objectKey);
    await file.save(request.body, { contentType: request.contentType });

    return {
      uri: `${GCS_PREFIX}${this.bucketName}/${objectKey}`,
      key: objectKey,
      contentType: request.contentType,
      sizeBytes: request.body.byteLength
    };
  }

  async readObject(uri: string): Promise<Uint8Array | null> {
    const match = uri.match(/^gcs:\/\/([^/]+)\/(.+)$/);
    if (!match) {
      return null;
    }
    const [, bucketName, key] = match;
    if (bucketName !== this.bucketName) {
      return null;
    }

    const storageModule = await import("@google-cloud/storage");
    const storage = new storageModule.Storage();
    const file = storage.bucket(bucketName).file(key);
    const [exists] = await file.exists();
    if (!exists) {
      return null;
    }
    const [buffer] = await file.download();
    return new Uint8Array(buffer);
  }

  async deleteObject(uri: string): Promise<void> {
    const match = uri.match(/^gcs:\/\/([^/]+)\/(.+)$/);
    if (!match) {
      return;
    }
    const [, bucketName, key] = match;
    if (bucketName !== this.bucketName) {
      return;
    }

    const storageModule = await import("@google-cloud/storage");
    const storage = new storageModule.Storage();
    await storage.bucket(bucketName).file(key).delete({ ignoreNotFound: true });
  }
}

export function createObjectStorage(env: ApiEnv): ObjectStorage {
  const provider = env.OBJECT_STORAGE_PROVIDER ?? "local";
  if (provider === "gcs") {
    if (!env.OBJECT_STORAGE_GCS_BUCKET) {
      throw new Error("Missing OBJECT_STORAGE_GCS_BUCKET for gcs object storage provider.");
    }
    return new GcsObjectStorage(env.OBJECT_STORAGE_GCS_BUCKET, env.OBJECT_STORAGE_GCS_PREFIX ?? "artifacts");
  }

  return new LocalObjectStorage(env.OBJECT_STORAGE_LOCAL_ROOT ?? ".neutrino/objects");
}

export function createArtifactChecksum(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}
