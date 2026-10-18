import type { ContentData } from '@localess/shared';

/**
 * The ids a document's data points to, stored next to it (`assets`, `references`, `links`) for the CDN to resolve:
 * every ASSET and REFERENCE value, and every LINK to a document, in any locale and any block. Sorted, without
 * duplicates. Whoever writes a document's data stores these with it (the editor's save, templates); never taken from
 * a client.
 */
export function contentRefs(data: ContentData): { assets: string[]; links: string[]; references: string[] } {
  const assets = new Set<string>();
  const links = new Set<string>();
  const references = new Set<string>();
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== 'object') return;
    const item = value as { kind?: unknown; type?: unknown; uri?: unknown };
    if (item.kind === 'ASSET' || item.kind === 'REFERENCE' || item.kind === 'LINK') {
      // A field left empty in the editor holds its kind without a uri (or an empty one): nothing to list.
      if (typeof item.uri !== 'string' || !item.uri) return;
      if (item.kind === 'ASSET') assets.add(item.uri);
      else if (item.kind === 'REFERENCE') references.add(item.uri);
      else if (item.kind === 'LINK' && item.type === 'content') links.add(item.uri);
      return;
    }
    Object.values(value).forEach(visit);
  };
  visit(data);
  const sorted = (ids: Set<string>) => [...ids].sort();
  return { assets: sorted(assets), links: sorted(links), references: sorted(references) };
}
