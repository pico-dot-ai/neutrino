export type CollabUpdate = {
  docId: string;
  actorId: string;
  updateBinary: Uint8Array;
};

export type CollabSnapshot = {
  docId: string;
  version: number;
  stateBinary: Uint8Array;
};

export interface CollabStore {
  loadDoc(docId: string): Promise<CollabSnapshot | null>;
  appendUpdate(update: CollabUpdate): Promise<void>;
  snapshot(docId: string): Promise<CollabSnapshot>;
}
