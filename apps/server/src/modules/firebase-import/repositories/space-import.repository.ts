import type { FirebaseImportStage } from '@localess/shared';
import { Inject, Injectable } from '@nestjs/common';

import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { locales, spaceEnvironments, spaceLocales, spaces } from '../../../infra/database/schema.js';
import { type Transaction, transaction } from '../../../infra/database/transaction.js';
import { EventService } from '../../../infra/events/event.service.js';
import { dropContentDrafts, dropContentLinks } from '../../../shared/data-rules/content-snapshots.js';
import { createPreviewToken } from '../../../shared/data-rules/space-tokens.js';
import type { SpaceInsertEntity } from '../../../shared/entities/space.entity.js';
import type { SpaceEnvironmentInsertEntity } from '../../../shared/entities/space-environment.entity.js';
import { FirebaseImportRepository } from './firebase-import.repository.js';

export type NewImportedSpace = SpaceInsertEntity & { id: string };

/** The imported space: its `spaces` row, its `space_locales` and `space_environments`, and the end of the import. */
@Injectable()
export class SpaceImportRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly firebaseImportRepository: FirebaseImportRepository,
    private readonly eventService: EventService,
  ) {}

  /** The ids of the `locales` table, the locales a space may have. */
  async findLocaleIds(): Promise<Set<string>> {
    return new Set((await this.db.select({ id: locales.id }).from(locales)).map(it => it.id));
  }

  /**
   * The space, its locales (in order) and its link to the RUNNING run in one transaction: nothing sees the space
   * without its import status. `RunAbandoned` (nothing written) when the run no longer runs.
   */
  create(runId: string, space: NewImportedSpace, localeIds: string[], stages: FirebaseImportStage[], tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      await t.insert(spaces).values(space);
      await t.insert(spaceLocales).values(localeIds.map((localeId, position) => ({ spaceId: space.id, localeId, position })));
      // Tokens are not imported: the space starts with its own preview token, as a new space does.
      await createPreviewToken(t, space.id);
      await this.firebaseImportRepository.linkSpace(runId, space.id, stages, t);
    });
  }

  insertEnvironments(rows: SpaceEnvironmentInsertEntity[], tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      await t.insert(spaceEnvironments).values(rows);
    });
  }

  /** Drops any content draft or `/links` list built while the import ran (content-snapshots.ts). */
  dropContentSnapshots(spaceId: string, tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      await dropContentDrafts(t, spaceId);
      await dropContentLinks(t, spaceId);
    });
  }

  /** Announces the finished space (a `spaces` change event): clients list it from now on. */
  publishCreated(spaceId: string): Promise<void> {
    return this.eventService.publish({ spaceId: null, entity: 'spaces', id: spaceId, op: 'created' });
  }
}
