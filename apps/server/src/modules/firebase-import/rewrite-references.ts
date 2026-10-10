
/** Firebase id → new UUID, per entity, for one imported space. */
export interface ReferenceMaps {
  assets: Map<string, string>;
  contents: Map<string, string>;
}

export interface RewriteResult<T> {
  value: T;
  changed: boolean;
  /** Ids no map knows (their target was deleted in Firebase before the import): kept as they are. */
  missing: { kind: 'asset' | 'content'; id: string }[];
}

type Missing = RewriteResult<unknown>['missing'];

function lookup(id: string, map: Map<string, string>, kind: 'asset' | 'content', missing: Missing): string {
  const mapped = map.get(id);
  if (mapped === undefined) missing.push({ kind, id });
  return mapped ?? id;
}

/**
 * Rewrites the references in content `data` by shape, at any depth and in every locale variant:
 * `{ kind: 'ASSET', uri }`, `{ kind: 'LINK', type: 'content', uri }`, `{ kind: 'REFERENCE', uri }`.
 * Block ids (`_id`) and schema names (`_schema`) are not references and stay.
 */
export function rewriteData(data: unknown, maps: ReferenceMaps): RewriteResult<unknown> {
  const missing: Missing = [];
  let changed = false;
  const walk = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(walk);
    if (!value || typeof value !== 'object') return value;
    const node = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(node)) out[key] = walk(item);
    if (typeof node['uri'] === 'string') {
      const kind = node['kind'] === 'ASSET' ? 'asset' : node['kind'] === 'REFERENCE' || (node['kind'] === 'LINK' && node['type'] === 'content') ? 'content' : undefined;
      if (kind) {
        const uri = lookup(node['uri'], kind === 'asset' ? maps.assets : maps.contents, kind, missing);
        if (uri !== node['uri']) changed = true;
        out['uri'] = uri;
      }
    }
    return out;
  };
  const value = walk(data);
  return { value, changed, missing };
}

/** Rewrites an id array (`assets`, `links`, `references`). */
export function rewriteIds(ids: string[] | null, map: Map<string, string>, kind: 'asset' | 'content'): RewriteResult<string[] | null> {
  const missing: Missing = [];
  if (!ids) return { value: null, changed: false, missing };
  const value = ids.map(id => lookup(id, map, kind, missing));
  return { value, changed: value.some((id, i) => id !== ids[i]), missing };
}
