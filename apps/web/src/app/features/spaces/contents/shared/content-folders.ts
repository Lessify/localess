import type { ContentFolderSummary } from '@localess/shared';

/*
 * The editor's folder map: every folder of the space (`GET …/contents/folders`), keyed by id. Breadcrumbs, paths and
 * move targets are built from it, so navigating needs only the current folder's id.
 */

/** The folders from the root down to `folderId` (the root itself is not a folder); empty when it is unknown. */
export function breadcrumbs(folders: Map<string, ContentFolderSummary>, folderId: string | null): ContentFolderSummary[] {
  const trail: ContentFolderSummary[] = [];
  const seen = new Set<string>();
  for (let id = folderId; id && !seen.has(id); ) {
    const folder = folders.get(id);
    if (!folder) return [];
    seen.add(id);
    trail.unshift(folder);
    id = folder.parentId ?? null;
  }
  return trail;
}

/** The folder's full slug ('' for the root). */
export function folderPath(folders: Map<string, ContentFolderSummary>, folderId: string | null): string {
  return breadcrumbs(folders, folderId)
    .map(it => it.slug)
    .join('/');
}

/** `folderId` and every folder under it: where it can not be moved. */
export function subtreeIds(folders: ContentFolderSummary[], folderId: string): Set<string> {
  const ids = new Set([folderId]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const it of folders) {
      if (it.parentId && ids.has(it.parentId) && !ids.has(it.id)) {
        ids.add(it.id);
        grew = true;
      }
    }
  }
  return ids;
}
