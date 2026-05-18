import type { CollabSnapshot, CollabUpdate } from "@neutrino/schema";

export interface CollaborationRepository {
  loadDoc(docId: string): Promise<CollabSnapshot | null>;
  appendUpdate(update: CollabUpdate): Promise<void>;
  snapshot(docId: string): Promise<CollabSnapshot>;
}
