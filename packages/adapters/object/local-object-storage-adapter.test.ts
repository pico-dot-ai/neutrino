import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import LocalObjectStorageAdapter from "./local-object-storage-adapter";

const createdDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    createdDirs.splice(0).map(async (dir) => {
      const { rm } = await import("node:fs/promises");
      await rm(dir, { recursive: true, force: true });
    })
  );
});

async function createTempRoot() {
  const dir = await mkdtemp(path.join(tmpdir(), "neutrino-object-storage-"));
  createdDirs.push(dir);
  return dir;
}

describe("LocalObjectStorageAdapter", () => {
  it("writes and reads object bytes using normalized key", async () => {
    const rootDir = await createTempRoot();
    const adapter = new LocalObjectStorageAdapter(rootDir);
    const body = new Uint8Array([1, 2, 3, 4]);

    const metadata = await adapter.writeObject({
      key: "/nested/path/file.bin",
      contentType: "application/octet-stream",
      body
    });

    expect(metadata).toEqual({
      uri: "local-object://nested/path/file.bin",
      key: "nested/path/file.bin",
      contentType: "application/octet-stream",
      sizeBytes: 4
    });

    const persisted = await readFile(path.join(rootDir, "nested/path/file.bin"));
    expect(Array.from(persisted)).toEqual([1, 2, 3, 4]);

    const readBack = await adapter.readObject(metadata.uri);
    expect(readBack).not.toBeNull();
    expect(Array.from(readBack ?? [])).toEqual([1, 2, 3, 4]);
  });

  it("returns null for unknown URI format and missing object", async () => {
    const rootDir = await createTempRoot();
    const adapter = new LocalObjectStorageAdapter(rootDir);

    await expect(adapter.readObject("not-local://file.txt")).resolves.toBeNull();
    await expect(adapter.readObject("local-object://does-not-exist.txt")).resolves.toBeNull();
  });

  it("deletes an existing object and ignores unknown URI formats", async () => {
    const rootDir = await createTempRoot();
    const adapter = new LocalObjectStorageAdapter(rootDir);

    const metadata = await adapter.writeObject({
      key: "to-delete.txt",
      contentType: "text/plain",
      body: new TextEncoder().encode("hello")
    });

    await adapter.deleteObject("not-local://to-delete.txt");
    expect(await adapter.readObject(metadata.uri)).not.toBeNull();

    await adapter.deleteObject(metadata.uri);
    await expect(adapter.readObject(metadata.uri)).resolves.toBeNull();
  });
});
