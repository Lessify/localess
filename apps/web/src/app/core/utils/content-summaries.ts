import { ContentKind, ContentSummary } from '@localess/shared';

import { folderPath } from './folder-tree';

/** A folder or document of the light list, with its path: its folders' slugs and its own, joined by '/'. */
export type ContentSummaryWithPath = ContentSummary & { fullSlug: string };

/** Every item of the light list with its path, worked out from the folder chain (the server sends no paths in it). */
export function withFullSlugs(items: ContentSummary[]): ContentSummaryWithPath[] {
  const folders = new Map(items.filter(it => it.kind === ContentKind.FOLDER).map(it => [it.id, it]));
  const parentPaths = new Map<string, string>();
  const parentPath = (parentId: string): string => {
    let path = parentPaths.get(parentId);
    if (path === undefined) {
      path = folderPath(folders, parentId, folder => folder.slug);
      parentPaths.set(parentId, path);
    }
    return path;
  };
  return items.map(it => {
    const parent = it.parentId ? parentPath(it.parentId) : '';
    return { ...it, fullSlug: parent ? `${parent}/${it.slug}` : it.slug };
  });
}
