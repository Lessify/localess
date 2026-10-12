import { Injectable } from '@nestjs/common';
import { newUuid } from '../../../infra/database/id.js';
import { randomSuffix } from '../../contents/utils/slug.utils.js';
import { ContentImportRepository, type ContentLink } from '../repositories/content-import.repository.js';
import { toContentData } from '../utils/content-data.js';
import { parseData, str, strings, timestamps } from '../utils/firebase-docs.js';
import type { ImportStage } from '../utils/firebase-import.utils.js';

/** Where Firebase put an item: paths of slugs, in no particular page order, never checked. */
interface FirebasePlace {
  id: string;
  kind: 'FOLDER' | 'DOCUMENT';
  slug: string;
  parentSlug: string;
  fullSlug: string;
}

/**
 * Stage 9: the contents, as stored, page by page; references are rewritten in the next stage. The tree is linked by
 * `parent_id` here, but Firebase pages come in no tree order (a child before its folder): each page goes in at the
 * root under a placeholder slug (its new id, unique), and after the last page one transaction links every item to the
 * folder its Firebase `parentSlug` names. A slug used twice under one parent is suffixed (as a clone does), a parent
 * that is not a folder, or one that would close a loop of folders, leaves the item at the root, each with a warning. Only the id map is kept for the next stage.
 */
@Injectable()
export class ContentImportService {
  constructor(private readonly contents: ContentImportRepository) {}

  /** Answers the count and the Firebase id → new id map, for the reference rewrite. */
  async import(stage: ImportStage): Promise<{ count: number; ids: Map<string, string> }> {
    const contentIds = new Map<string, string>();
    const places: FirebasePlace[] = [];
    let contentCount = 0;
    for await (const page of stage.client.pages(stage.sourceSpaceId, 'contents')) {
      const rows = page.map(doc => {
        const isDocument = doc['kind'] === 'DOCUMENT';
        const slug = str(doc['slug']) ?? doc.id;
        const parentSlug = typeof doc['parentSlug'] === 'string' ? doc['parentSlug'] : '';
        const fullSlug = str(doc['fullSlug']) ?? (parentSlug ? `${parentSlug}/${slug}` : slug);
        const parsed = isDocument ? parseData(doc['data']) : { data: null, invalid: false };
        if (parsed.invalid) stage.warn(`${fullSlug}: data is not valid JSON, imported empty`);
        const id = newUuid(timestamps(doc).createdAt);
        contentIds.set(doc.id, id);
        places.push({ id, kind: isDocument ? 'DOCUMENT' : 'FOLDER', slug, parentSlug, fullSlug });
        return {
          id,
          spaceId: stage.spaceId,
          parentId: null,
          kind: isDocument ? ('DOCUMENT' as const) : ('FOLDER' as const),
          name: str(doc['name']) ?? slug,
          // Unique at the root until the tree is linked.
          slug: id,
          schema: isDocument ? str(doc['schema']) : null,
          data: toContentData(parsed.data, str(doc['schema']), newUuid, message => stage.warn(`${fullSlug}: ${message}`)),
          assets: strings(doc['assets']),
          links: strings(doc['links']),
          references: strings(doc['references']),
          publishedAt: null,
          ...timestamps(doc),
        };
      });
      await this.contents.insertMany(rows);
      contentCount += rows.length;
      await stage.progress(contentCount);
    }
    await this.contents.linkTree(stage.spaceId, this.planTree(stage, places));
    return { count: contentCount, ids: contentIds };
  }

  /** Each item's parent (the folder at its Firebase `parentSlug`) and a slug unique among its siblings. */
  private planTree(stage: ImportStage, places: FirebasePlace[]): ContentLink[] {
    const folderByPath = new Map<string, string>();
    for (const it of places) if (it.kind === 'FOLDER' && !folderByPath.has(it.fullSlug)) folderByPath.set(it.fullSlug, it.id);
    const taken = new Set<string>();
    const parentOf = new Map<string, string | null>();
    // Whether `parentId`, or a folder above it as linked so far, is `id`: linking would close a loop.
    const closesLoop = (id: string, parentId: string): boolean => {
      for (let at: string | null | undefined = parentId, steps = 0; at && steps <= places.length; at = parentOf.get(at), steps++) {
        if (at === id) return true;
      }
      return false;
    };
    return places.map(it => {
      let parentId: string | null = null;
      if (it.parentSlug) {
        parentId = folderByPath.get(it.parentSlug) ?? null;
        if (!parentId) stage.warn(`${it.fullSlug}: parent folder '${it.parentSlug}' not found, imported at the root`);
        else if (closesLoop(it.id, parentId)) {
          stage.warn(`${it.fullSlug}: parent folder '${it.parentSlug}' would make a cycle, imported at the root`);
          parentId = null;
        }
      }
      parentOf.set(it.id, parentId);
      const parentPath = parentId ? it.parentSlug : '';
      let slug = it.slug;
      while (taken.has(`${parentId ?? ''}/${slug}`)) slug = `${it.slug}-${randomSuffix()}`;
      if (slug !== it.slug) stage.warn(`${it.fullSlug}: path used twice, imported as ${parentPath ? `${parentPath}/${slug}` : slug}`);
      taken.add(`${parentId ?? ''}/${slug}`);
      return { id: it.id, parentId, slug };
    });
  }
}
