import { eq } from 'drizzle-orm';
import type { Database } from '../../../infra/database/database.module.js';
import { spaces } from '../../../infra/database/schema.js';
import { transaction, type Transaction } from '../../../infra/database/transaction.js';
import type { EventService } from '../../../infra/events/event.service.js';
import { requireSpace, type SpaceRow } from '../../../shared/queries/space.query.js';
import type { SpaceInsertEntity } from '../../../shared/entities/space.entity.js';

/** Values of the space row itself a change may set with its touch. */
export type SpaceValues = Partial<Pick<SpaceInsertEntity, 'name' | 'defaultLocaleId'>>;

/**
 * The rule every change of a space, its locales or its environments follows, in one transaction: the change, then the
 * space's `updated_at` (a change of locales or environments alone still touches the space, with the values `work`
 * returns) and a `spaces` event. Answers the space as it is after.
 */
export function changeSpace(
  db: Database,
  events: EventService,
  spaceId: string,
  tx: Transaction | undefined,
  work: (tx: Transaction) => Promise<SpaceValues | void>,
): Promise<SpaceRow> {
  return transaction(db, tx, async t => touchSpace(t, events, spaceId, (await work(t)) ?? {}));
}

/** As `changeSpace`, for work on a row that may not be there: `work` answers `false` then, and nothing is touched. */
export function changeSpaceIfFound(
  db: Database,
  events: EventService,
  spaceId: string,
  tx: Transaction | undefined,
  work: (tx: Transaction) => Promise<boolean>,
): Promise<SpaceRow | undefined> {
  return transaction(db, tx, async t => ((await work(t)) ? touchSpace(t, events, spaceId, {}) : undefined));
}

async function touchSpace(tx: Transaction, events: EventService, spaceId: string, values: SpaceValues): Promise<SpaceRow> {
  await tx
    .update(spaces)
    // Named: a change of locales or environments alone still touches the space.
    .set({ ...values, updatedAt: new Date() })
    .where(eq(spaces.id, spaceId));
  await events.publish({ spaceId: null, entity: 'spaces', id: spaceId, op: 'updated' }, tx);
  return requireSpace(tx, spaceId);
}
