import { Inject, Injectable } from '@nestjs/common';
import { and, eq, max } from 'drizzle-orm';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { spaceLocales } from '../../../infra/database/schema.js';
import type { Transaction } from '../../../infra/database/transaction.js';
import { EventService } from '../../../infra/events/event.service.js';
import { dropContentDrafts, dropContentLocale } from '../../../shared/data-rules/content-snapshots.js';
import { dropTranslationDrafts, dropTranslationLocale } from '../../../shared/data-rules/translation-drafts.js';
import { changeSpace } from './space-change.js';

/**
 * A space's locales (`space_locales`) and its default locale. Every change touches the space and announces it
 * (`changeSpace`), and drops the translation drafts and content snapshots it makes stale.
 */
@Injectable()
export class SpaceLocaleRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly eventService: EventService,
  ) {}

  /** At the end of the space's list; the translation drafts gain the locale. */
  create(spaceId: string, localeId: string, tx?: Transaction): Promise<void> {
    return changeSpace(this.db, this.eventService, spaceId, tx, async t => {
      const [{ last }] = await t
        .select({ last: max(spaceLocales.position) })
        .from(spaceLocales)
        .where(eq(spaceLocales.spaceId, spaceId));
      await t.insert(spaceLocales).values({ spaceId, localeId, position: (last ?? -1) + 1 });
      await dropTranslationDrafts(t, spaceId);
    });
  }

  /** Its values stay; its translation maps and content snapshots go (requests for it get the default locale's). */
  delete(spaceId: string, localeId: string, tx?: Transaction): Promise<void> {
    return changeSpace(this.db, this.eventService, spaceId, tx, async t => {
      await t.delete(spaceLocales).where(and(eq(spaceLocales.spaceId, spaceId), eq(spaceLocales.localeId, localeId)));
      await dropTranslationDrafts(t, spaceId);
      await dropTranslationLocale(t, spaceId, localeId);
      await dropContentLocale(t, spaceId, localeId);
    });
  }

  /** `localeIds`: every locale of the space, in the new order. */
  reorder(spaceId: string, localeIds: string[], tx?: Transaction): Promise<void> {
    return changeSpace(this.db, this.eventService, spaceId, tx, async t => {
      for (const [position, localeId] of localeIds.entries()) {
        await t
          .update(spaceLocales)
          .set({ position })
          .where(and(eq(spaceLocales.spaceId, spaceId), eq(spaceLocales.localeId, localeId)));
      }
    });
  }

  /**
   * Draft translation maps fill gaps from the default locale and content drafts read it from the bare fields, so both
   * go; published ones keep what their publish built.
   */
  setDefault(spaceId: string, localeId: string, tx?: Transaction): Promise<void> {
    return changeSpace(this.db, this.eventService, spaceId, tx, async t => {
      await dropTranslationDrafts(t, spaceId);
      await dropContentDrafts(t, spaceId);
      return { defaultLocaleId: localeId };
    });
  }
}
