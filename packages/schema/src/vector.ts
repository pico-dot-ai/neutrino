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
