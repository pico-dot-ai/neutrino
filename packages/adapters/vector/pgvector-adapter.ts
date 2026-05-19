import type {
  VectorMatch,
  VectorQuery,
  VectorRecord
} from "@neutrino/schema";
import type { VectorIndex } from "@neutrino/ports";
import { Pool, type PoolConfig } from "pg";

export class PgVectorAdapter implements VectorIndex {
  private readonly pool: Pool;
  private schemaReady: Promise<void> | null = null;

  constructor(config: PoolConfig | string) {
    this.pool = new Pool(typeof config === "string" ? { connectionString: config } : config);
  }

  async upsert(records: VectorRecord[]): Promise<void> {
    if (records.length === 0) {
      return;
    }

    await this.ensureSchema();
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      for (const record of records) {
        await client.query(
          `INSERT INTO neutrino_vectors (namespace, vector_id, embedding, metadata)
           VALUES ($1, $2, $3::vector, $4::jsonb)
           ON CONFLICT (namespace, vector_id)
           DO UPDATE SET embedding = EXCLUDED.embedding, metadata = EXCLUDED.metadata`,
          [record.namespace, record.id, toVectorLiteral(record.values), JSON.stringify(record.metadata ?? {})]
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async query(query: VectorQuery): Promise<VectorMatch[]> {
    await this.ensureSchema();
    const rows = await this.pool.query<{
      id: string;
      score: number;
      metadata: Record<string, unknown> | null;
    }>(
      `SELECT
        vector_id AS id,
        1 - (embedding <=> $2::vector) AS score,
        metadata
      FROM neutrino_vectors
      WHERE namespace = $1
      ORDER BY embedding <=> $2::vector
      LIMIT $3`,
      [query.namespace, toVectorLiteral(query.values), query.topK]
    );

    return rows.rows.map((row) => ({
      id: row.id,
      score: Number(row.score),
      metadata: row.metadata ?? undefined
    }));
  }

  async deleteByNamespace(namespace: string): Promise<void> {
    await this.ensureSchema();
    await this.pool.query(`DELETE FROM neutrino_vectors WHERE namespace = $1`, [namespace]);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  private async ensureSchema() {
    if (!this.schemaReady) {
      this.schemaReady = (async () => {
        await this.pool.query(`CREATE EXTENSION IF NOT EXISTS vector`);
        await this.pool.query(`
          CREATE TABLE IF NOT EXISTS neutrino_vectors (
            namespace TEXT NOT NULL,
            vector_id TEXT NOT NULL,
            embedding vector NOT NULL,
            metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            PRIMARY KEY (namespace, vector_id)
          )
        `);
      })();
    }

    await this.schemaReady;
  }
}

function toVectorLiteral(values: number[]) {
  return `[${values.join(",")}]`;
}
