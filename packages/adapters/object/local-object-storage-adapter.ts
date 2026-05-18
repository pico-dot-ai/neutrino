import fs from "node:fs/promises";
import path from "node:path";
import type { ObjectMetadata, ObjectStorage, ObjectWriteRequest } from "@neutrino/ports";

export default class LocalObjectStorageAdapter implements ObjectStorage {
  constructor(private readonly rootDir: string) {}

  async writeObject(request: ObjectWriteRequest): Promise<ObjectMetadata> {
    const safeKey = request.key.replace(/^\/+/, "");
    const absolutePath = path.join(this.rootDir, safeKey);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, request.body);

    return {
      uri: `local-object://${safeKey}`,
      key: safeKey,
      contentType: request.contentType,
      sizeBytes: request.body.byteLength
    };
  }

  async readObject(uri: string): Promise<Uint8Array | null> {
    const key = this.keyFromUri(uri);
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
    const key = this.keyFromUri(uri);
    if (!key) {
      return;
    }

    await fs.rm(path.join(this.rootDir, key), { force: true });
  }

  private keyFromUri(uri: string) {
    const prefix = "local-object://";
    return uri.startsWith(prefix) ? uri.slice(prefix.length) : null;
  }
}
