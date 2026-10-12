import { Injectable } from '@nestjs/common';
import { newUuid } from '../../../infra/database/id.js';
import { randomSuffix } from '../../contents/utils/slug.utils.js';
import { ContentImportRepository } from '../repositories/content-import.repository.js';
import { parseData, str, strings, timestamps } from '../utils/firebase-docs.js';
import type { ImportStage } from '../utils/firebase-import.utils.js';

/** Stage 9: the contents, as stored, page by page; references are rewritten in the next stage. Only the id map is kept. */
@Injectable()
export class ContentImportService {
  constructor(private readonly contents: ContentImportRepository) {}

  /**
   * Answers the count and the Firebase id → new id map, for the reference rewrite. Firestore did not keep paths unique:
   * the first item imported keeps a path, a later one gets a suffixed slug (as a clone does), with a warning.
   */
  async import(stage: ImportStage): Promise<{ count: number; ids: Map<string, string> }> {
    const contentIds = new Map<string, string>();
    const paths = new Set<string>();
    let contentCount = 0;
    for await (const page of stage.client.pages(stage.sourceSpaceId, 'contents')) {
      const rows = page.map(doc => {
        const isDocument = doc['kind'] === 'DOCUMENT';
        let slug = str(doc['slug']) ?? doc.id;
        const parentSlug = typeof doc['parentSlug'] === 'string' ? doc['parentSlug'] : '';
        let fullSlug = str(doc['fullSlug']) ?? (parentSlug ? `${parentSlug}/${slug}` : slug);
        if (paths.has(fullSlug)) {
          const original = fullSlug;
          do {
            slug = `${str(doc['slug']) ?? doc.id}-${randomSuffix()}`;
            fullSlug = parentSlug ? `${parentSlug}/${slug}` : slug;
          } while (paths.has(fullSlug));
          stage.warn(`${original}: path used twice, imported as ${fullSlug}`);
        }
        paths.add(fullSlug);
        const parsed = isDocument ? parseData(doc['data']) : { data: null, invalid: false };
        if (parsed.invalid) stage.warn(`${fullSlug}: data is not valid JSON, imported empty`);
        const id = newUuid(timestamps(doc).createdAt);
        contentIds.set(doc.id, id);
        return {
          id,
          spaceId: stage.spaceId,
          kind: isDocument ? ('DOCUMENT' as const) : ('FOLDER' as const),
          name: str(doc['name']) ?? slug,
          slug,
          parentSlug,
          fullSlug,
          schema: isDocument ? str(doc['schema']) : null,
          data: parsed.data,
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
    return { count: contentCount, ids: contentIds };
  }
}
