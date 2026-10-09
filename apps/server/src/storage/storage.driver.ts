import type { Readable } from 'node:stream';

export const STORAGE_DRIVER = Symbol('STORAGE_DRIVER');

export interface StoredObjectInfo {
  size: number;
  /** Base64 md5, the same encoding as GCS `md5Hash`. */
  md5: string;
}

export interface ByteRange {
  start: number;
  /** Inclusive. */
  end: number;
}

/**
 * Binary object storage (was the default Cloud Storage bucket). Keys keep the Firebase layout,
 * e.g. `spaces/{spaceId}/assets/{assetId}/original`. Only binaries live here; published JSON moved
 * into Postgres.
 */
export interface StorageDriver {
  put(key: string, data: Buffer | Readable): Promise<StoredObjectInfo>;
  /** undefined when the object doesn't exist. */
  stat(key: string): Promise<{ size: number } | undefined>;
  read(key: string): Promise<Buffer>;
  createReadStream(key: string, range?: ByteRange): Readable;
  delete(key: string): Promise<void>;
  /** Deletes every object whose key starts with `prefix` (a folder, e.g. `spaces/{id}/`). */
  deletePrefix(prefix: string): Promise<void>;
  move(from: string, to: string): Promise<void>;
  /** Sum of object sizes under `prefix` (space overview). */
  sizeOfPrefix(prefix: string): Promise<number>;
}
