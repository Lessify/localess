import { Injectable } from '@nestjs/common';
import type { ContentData } from '@localess/shared';
import { ContentImportRepository } from '../repositories/content-import.repository.js';
import { pathOf } from '../../../shared/queries/content-tree.query.js';
import type { ImportStage } from '../utils/firebase-import.utils.js';
import { type ReferenceMaps, rewriteData, rewriteIds } from '../utils/rewrite-references.js';

/** Rows of the space read at once by the content migration. */
const PAGE_SIZE = 500;

/**
 * Stage 10, the content migration: the Firebase ids in the imported contents (`data` references, `assets`, `links`,
 * `references`) become the new ones, in pages of the space's rows. A reference without a target stays, with a warning.
 */
@Injectable()
export class ReferenceRewriteService {
  constructor(private readonly contents: ContentImportRepository) {}

  /** Answers the number of contents rewritten. */
  async rewrite(stage: ImportStage, maps: ReferenceMaps): Promise<number> {
    const sid = stage.spaceId;
    let rewritten = 0;
    let after: string | undefined;
    const folders = await this.contents.folderPaths(sid);
    for (;;) {
      const rows = await this.contents.findReferencesPage(sid, after, PAGE_SIZE);
      if (!rows.length) break;
      for (const row of rows) {
        const data = rewriteData(row.data, maps);
        const assetRefs = rewriteIds(row.assets, maps.assets, 'asset');
        const links = rewriteIds(row.links, maps.contents, 'content');
        const references = rewriteIds(row.references, maps.contents, 'content');
        const missing = new Set(
          [...data.missing, ...assetRefs.missing, ...links.missing, ...references.missing].map(it => `${it.kind} '${it.id}'`),
        );
        for (const it of missing) stage.warn(`${pathOf(row, folders).fullSlug}: no ${it}`);
        if (data.changed || assetRefs.changed || links.changed || references.changed) {
          await this.contents.updateReferences(sid, row.id, {
            data: data.value as ContentData | null,
            assets: assetRefs.value,
            links: links.value,
            references: references.value,
          });
          rewritten++;
        }
      }
      after = rows[rows.length - 1].id;
      await stage.progress(rewritten);
    }
    return rewritten;
  }
}
