import type {
  VectorMatch,
  VectorQuery,
  VectorRecord
} from "@neutrino/schema";
import type { VectorIndex } from "@neutrino/ports";

export class PgVectorAdapter implements VectorIndex {
  async upsert(_records: VectorRecord[]): Promise<void> {
    throw new Error("Not implemented.");
  }

  async query(_query: VectorQuery): Promise<VectorMatch[]> {
    throw new Error("Not implemented.");
  }

  async deleteByNamespace(_namespace: string): Promise<void> {
    throw new Error("Not implemented.");
  }
}
