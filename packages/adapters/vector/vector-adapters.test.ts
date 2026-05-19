import { describe, expect, it } from "vitest";
import { PgVectorAdapter } from "./pgvector-adapter";
import { QdrantAdapter } from "./qdrant-adapter";

describe("vector adapters (current placeholder behavior)", () => {
  it("PgVectorAdapter persists/query/deletes vectors when PGVECTOR_TEST_DATABASE_URL is set", async () => {
    const connectionString = process.env.PGVECTOR_TEST_DATABASE_URL;
    if (!connectionString) {
      return;
    }

    const namespace = `ns-${crypto.randomUUID()}`;
    const adapter = new PgVectorAdapter(connectionString);
    try {
      await adapter.upsert([
        { id: "a", namespace, values: [1, 0, 0], metadata: { label: "alpha" } },
        { id: "b", namespace, values: [0.8, 0.2, 0], metadata: { label: "beta" } },
        { id: "c", namespace, values: [0, 1, 0], metadata: { label: "gamma" } }
      ]);

      const matches = await adapter.query({
        namespace,
        values: [1, 0, 0],
        topK: 2
      });

      expect(matches).toHaveLength(2);
      expect(matches[0]?.id).toBe("a");
      expect(matches[0]?.metadata).toEqual({ label: "alpha" });
      expect(matches[0]?.score).toBeGreaterThan(matches[1]?.score ?? -1);

      await adapter.deleteByNamespace(namespace);
      const empty = await adapter.query({
        namespace,
        values: [1, 0, 0],
        topK: 2
      });
      expect(empty).toEqual([]);
    } finally {
      await adapter.close();
    }
  });

  it("QdrantAdapter methods are explicit placeholders", async () => {
    const adapter = new QdrantAdapter();

    await expect(adapter.upsert([])).rejects.toThrow("Not implemented.");
    await expect(
      adapter.query({ namespace: "test", vector: [0.1, 0.2], topK: 3 })
    ).rejects.toThrow("Not implemented.");
    await expect(adapter.deleteByNamespace("test")).rejects.toThrow("Not implemented.");
  });
});
