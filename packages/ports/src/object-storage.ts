export type ObjectWriteRequest = {
  key: string;
  body: Uint8Array;
  contentType: string;
};

export type ObjectMetadata = {
  uri: string;
  key: string;
  contentType: string;
  sizeBytes: number;
};

export interface ObjectStorage {
  writeObject(request: ObjectWriteRequest): Promise<ObjectMetadata>;
  readObject(uri: string): Promise<Uint8Array | null>;
  deleteObject(uri: string): Promise<void>;
}
