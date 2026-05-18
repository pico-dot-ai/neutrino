import type {
  CollabSnapshot,
  CollabUpdate
} from "@neutrino/schema";
import type { CollaborationRepository } from "@neutrino/ports";

export class YjsAdapter implements CollaborationRepository {
  async loadDoc(_docId: string): Promise<CollabSnapshot | null> {
    throw new Error("Not implemented.");
  }

  async appendUpdate(_update: CollabUpdate): Promise<void> {
    throw new Error("Not implemented.");
  }

  async snapshot(_docId: string): Promise<CollabSnapshot> {
    throw new Error("Not implemented.");
  }
}
