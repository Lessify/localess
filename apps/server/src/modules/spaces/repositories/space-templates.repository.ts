import { Inject, Injectable } from '@nestjs/common';
import { DEFAULT_LOCALE } from '@localess/shared';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { newUuid } from '../../../infra/database/id.js';
import { schemas, spaceLocales, translations } from '../../../infra/database/schema.js';
import { transaction, type Transaction } from '../../../infra/database/transaction.js';
import { requireSpace, type SpaceRow } from '../../../shared/queries/space.query.js';
import type { SpaceTemplate } from '../templates/index.js';
import { SpacesRepository } from './spaces.repository.js';

/** Rows per insert: well under Postgres' 65,535 bind parameters (a translation row binds 7). */
const CHUNK = 1000;

/**
 * A new space with what its template holds, in one transaction: the space as `SpacesRepository.create` makes it (default
 * locale, preview token, `spaces` event), then the template's locales, schemas and translations. Nothing else is
 * needed: a new space has no drafts to drop, and nobody reads its schemas or translations before the commit.
 */
@Injectable()
export class SpaceTemplatesRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly spaces: SpacesRepository,
  ) {}

  createSpace(name: string, template: SpaceTemplate, tx?: Transaction): Promise<SpaceRow> {
    return transaction(this.db, tx, async t => {
      const { id: spaceId } = await this.spaces.create(name, DEFAULT_LOCALE.id, t);
      const locales = template.locales ?? [];
      if (locales.length) {
        await t.insert(spaceLocales).values(locales.map((localeId, index) => ({ spaceId, localeId, position: index + 1 })));
      }
      if (template.schemas.length) {
        await t.insert(schemas).values(
          // Templates are in the export format, where `id` is the name.
          template.schemas.map(schema => ({
            id: newUuid(),
            spaceId,
            name: schema.id,
            type: schema.type,
            displayName: schema.displayName,
            description: schema.description,
            labels: schema.labels,
            previewField: 'previewField' in schema ? schema.previewField : undefined,
            fields: 'fields' in schema ? schema.fields : undefined,
            values: 'values' in schema ? schema.values : undefined,
          })),
        );
      }
      const rows = (template.translations?.() ?? []).map(it => ({
        id: newUuid(),
        spaceId,
        key: it.key,
        locales: it.locales,
        labels: it.labels ?? null,
        description: it.description ?? null,
      }));
      for (let start = 0; start < rows.length; start += CHUNK) {
        await t.insert(translations).values(rows.slice(start, start + CHUNK));
      }
      return requireSpace(t, spaceId);
    });
  }
}
