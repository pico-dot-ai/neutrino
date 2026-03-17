import type {
  CollabSnapshot,
  CollabStore,
  CollabUpdate
} from "../../contracts/src/collab-store";

export class YjsAdapter implements CollabStore {
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
