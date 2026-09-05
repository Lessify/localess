import { DocumentReference, DocumentSnapshot, Firestore } from 'firebase-admin/firestore';
import { mapWithConcurrency } from './map-with-concurrency';

/**
 * Documents per `batchGetDocuments` request. `Firestore.getAll()` does not chunk — it puts every
 * ref into one request — so a caller-sized list has to be split. 300 keeps the request small
 * (~35 KB of document paths) and bounds the snapshots held in memory per response.
 */
const DEFAULT_CHUNK_SIZE = 300;

/** Chunk requests in flight at once. */
const DEFAULT_CONCURRENCY = 5;

/** The slice of `Firestore` this helper needs, so callers can inject a double in tests. */
type DocumentGetter = Pick<Firestore, 'getAll'>;

export type GetAllInChunksOptions = {
  /** Documents per request. Defaults to 300. */
  chunkSize?: number;
  /** Requests in flight at once. Defaults to 5. */
  concurrency?: number;
};

/**
 * Read many documents with `getAll()`, split across several batched requests.
 *
 * Prefer this over mapping refs to individual `.get()` calls: one `batchGetDocuments` RPC per
 * chunk replaces one round-trip per document. `getAll()` returns a snapshot for every requested
 * ref — with `exists === false` for documents that are absent — and the SDK re-sorts each
 * response into request order, so the returned array is positionally aligned with `refs`.
 *
 * @param {DocumentGetter} firestore Firestore instance
 * @param {Array} refs documents to read
 * @param {GetAllInChunksOptions} options chunk size and request concurrency
 * @return {Promise} one snapshot per ref, in the order the refs were given
 */
export async function getAllInChunks(
  firestore: DocumentGetter,
  refs: readonly DocumentReference[],
  options: GetAllInChunksOptions = {}
): Promise<DocumentSnapshot[]> {
  if (refs.length === 0) {
    return [];
  }
  const chunkSize = Math.max(1, Math.floor(options.chunkSize ?? DEFAULT_CHUNK_SIZE) || DEFAULT_CHUNK_SIZE);
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;

  const chunks: DocumentReference[][] = [];
  for (let i = 0; i < refs.length; i += chunkSize) {
    chunks.push(refs.slice(i, i + chunkSize) as DocumentReference[]);
  }

  const results = await mapWithConcurrency(chunks, concurrency, chunk => firestore.getAll(...chunk));
  return results.flat();
}
