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
