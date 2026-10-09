/**
 * The storage-only fields removed before a document is returned inside a `references` map.
 */
type StorageIdFields = {
  assets?: unknown;
  links?: unknown;
  references?: unknown;
};

/**
 * Remove the `assets`, `links` and `references` id arrays from a stored content document.
 *
 * These arrays are a denormalized index of edges that already exist inside `data` — a `REFERENCE`
 * field value carries its own `uri` — so they are redundant on the wire and are an internal storage
 * concern. The CDN handlers already strip them from the top-level document; this does the same for
 * documents returned inside a `references` map.
 *
 * Every other field is carried through, including ones added to the storage shape later.
 *
 * @param {object} stored a stored content document
 * @return {object} a shallow copy without the three id arrays
 */
export function stripStorageIds<T extends StorageIdFields>(stored: T): Omit<T, 'assets' | 'links' | 'references'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- bound only to omit them
  const { assets, links, references, ...rest } = stored;
  return rest;
}
