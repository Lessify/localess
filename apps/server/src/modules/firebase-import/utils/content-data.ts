import type { ContentData, ContentValue } from '@localess/shared';
import { zContentValue } from '@localess/shared/zod';

/*
 * Firestore stored a document's data unchecked. The `contents.data` column holds blocks of known values
 * (`zContentData`), so an imported document's data is brought to that shape: a block's legacy `schema` key is removed,
 * its value becoming `_schema` when the block has none (as the editor's `normalizeContent` does) or repeating it, a root without `_id`/`_schema` gets them, `null`s and empty
 * arrays go (the editor drops them too), a link without a target gets the editor's default (`_self`), and a value of
 * no known shape is dropped with a warning naming its path.
 */

type Raw = Record<string, unknown>;

const isObject = (value: unknown): value is Raw => typeof value === 'object' && value !== null && !Array.isArray(value);

/** A block, or one stored before `_schema` existed (only the legacy `schema` key). */
const isBlockLike = (value: unknown): value is Raw =>
  isObject(value) && typeof value['_id'] === 'string' && (typeof value['_schema'] === 'string' || typeof value['schema'] === 'string');

/**
 * The block without its legacy `schema` key: `_schema` is taken from it when the block has none, and it is removed
 * when it repeats `_schema` (older blocks carry both); the app reads `_schema` alone. A `schema` that differs from the
 * block's `_schema` is a field of that name (only `_id` and `_schema` are reserved) and stays.
 */
function withSchemaKey(block: Raw): Raw {
  if (typeof block['schema'] !== 'string') return block;
  const { schema, ...rest } = block;
  const own = typeof rest['_schema'] === 'string' && rest['_schema'] ? rest['_schema'] : undefined;
  if (own === undefined) return { ...rest, _schema: schema };
  return own === schema ? rest : block;
}

function cleanBlock(block: Raw, path: string, warn: (message: string) => void): ContentData {
  const source = withSchemaKey(block);
  const result: Raw = { _id: source['_id'], _schema: source['_schema'] };
  for (const [key, value] of Object.entries(source)) {
    if (key === '_id' || key === '_schema') continue;
    const cleaned = cleanValue(value, path ? `${path}.${key}` : key, warn);
    if (cleaned !== undefined) result[key] = cleaned;
  }
  return result as ContentData;
}

function cleanValue(value: unknown, path: string, warn: (message: string) => void): ContentValue | undefined {
  if (value === null || value === undefined) return undefined;
  if (Array.isArray(value) && value.length === 0) return undefined;
  if (isBlockLike(value)) return cleanBlock(value, path, warn);
  // Links saved before the editor set a target open in the same tab, its default.
  if (isObject(value) && value['kind'] === 'LINK' && value['target'] === undefined) value = { ...value, target: '_self' };
  if (Array.isArray(value) && value.every(isBlockLike)) return value.map((it, index) => cleanBlock(it, `${path}.${index}`, warn));
  if (zContentValue.safeParse(value).success) return value as ContentValue;
  warn(`'${path}' is not a known value, dropped`);
  return undefined;
}

/**
 * `data` as `contents.data` holds it, or null when there is none. `schema`: the document's schema, for a root without
 * `_schema`; `newId`: an id for a root without `_id`.
 */
export function toContentData(
  data: Raw | null,
  schema: string | null,
  newId: () => string,
  warn: (message: string) => void,
): ContentData | null {
  if (!data) return null;
  const root = withSchemaKey(data);
  if (typeof root['_id'] !== 'string' || !root['_id'] || typeof root['_schema'] !== 'string' || !root['_schema']) {
    warn('data has no _id or _schema, filled in');
    if (typeof root['_id'] !== 'string' || !root['_id']) root['_id'] = newId();
    if (typeof root['_schema'] !== 'string' || !root['_schema']) root['_schema'] = schema ?? '';
  }
  return cleanBlock(root, '', warn);
}
