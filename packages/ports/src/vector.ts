import type { VectorMatch, VectorQuery, VectorRecord } from "@neutrino/schema";

export interface VectorIndex {
  upsert(records: VectorRecord[]): Promise<void>;
  query(query: VectorQuery): Promise<VectorMatch[]>;
  deleteByNamespace(namespace: string): Promise<void>;
}
