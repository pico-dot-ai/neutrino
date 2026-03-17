export type VectorRecord = {
  id: string;
  values: number[];
  namespace: string;
  metadata?: Record<string, unknown>;
};

export type VectorQuery = {
  values: number[];
  namespace: string;
  topK: number;
};

export type VectorMatch = {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
};

export interface VectorStore {
  upsert(records: VectorRecord[]): Promise<void>;
  query(query: VectorQuery): Promise<VectorMatch[]>;
  deleteByNamespace(namespace: string): Promise<void>;
}
