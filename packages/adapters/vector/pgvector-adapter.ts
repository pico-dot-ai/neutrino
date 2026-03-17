import type {
  VectorMatch,
  VectorQuery,
  VectorRecord,
  VectorStore
} from "../../contracts/src/vector-store";

export class PgVectorAdapter implements VectorStore {
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
