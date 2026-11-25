/*
 * The editor's folder maps: every folder of a space (`GET …/contents/folders`, `GET …/assets/folders`), keyed by id.
 * Breadcrumbs, paths and move targets are built from them, so navigating needs only the current folder's id.
 */

/** A folder as a folder map holds it. */
export interface TreeFolder {
  id: string;
  parentId?: string;
}

/** The folders from the root down to `folderId` (the root itself is not a folder); empty when it is unknown. */
export function breadcrumbs<T extends TreeFolder>(folders: Map<string, T>, folderId: string | null): T[] {
  const trail: T[] = [];
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

/** The folder's path ('' for the root), its folders' `segment` joined by '/': slugs for contents, names for assets. */
export function folderPath<T extends TreeFolder>(folders: Map<string, T>, folderId: string | null, segment: (folder: T) => string): string {
  return breadcrumbs(folders, folderId).map(segment).join('/');
}

/** `folderId` and every folder under it: where it can not be moved. */
export function subtreeIds(folders: TreeFolder[], folderId: string): Set<string> {
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

/** Where an asset is, by folder names: `~` for the root, `~/Images/Photos` under it. */
export function assetLocation<T extends TreeFolder & { name: string }>(folders: Map<string, T>, parentId: string | undefined): string {
  const path = folderPath(folders, parentId ?? null, folder => folder.name);
  return path ? `~/${path}` : '~';
}
