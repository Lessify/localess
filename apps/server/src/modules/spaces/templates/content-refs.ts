import type { ContentData } from '@localess/shared';

/**
 * The ids a document's data points to, as the app sends them with every save (`assets`, `references`, `links`): every
 * ASSET and REFERENCE value, and every LINK to a document, in any locale and any block. Sorted, without duplicates.
 */
export function contentRefs(data: ContentData): { assets: string[]; links: string[]; references: string[] } {
  const assets = new Set<string>();
  const links = new Set<string>();
  const references = new Set<string>();
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== 'object') return;
    const item = value as { kind?: unknown; type?: unknown; uri?: unknown };
    if (typeof item.uri === 'string') {
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
