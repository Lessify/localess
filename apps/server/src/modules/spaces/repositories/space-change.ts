import { eq } from 'drizzle-orm';
import type { Database } from '../../../infra/database/database.module.js';
import { spaces } from '../../../infra/database/schema.js';
import { transaction, type Transaction } from '../../../infra/database/transaction.js';
import type { EventService } from '../../../infra/events/event.service.js';
import type { SpaceEntity, SpaceInsertEntity } from '../../../shared/entities/space.entity.js';

/** Values of the space row itself a change may set with its touch. */
export type SpaceValues = Partial<Pick<SpaceInsertEntity, 'name' | 'defaultLocaleId'>>;

/** The space as `work` finds it, locked: what a change re-checks before it writes. */
export type LockedSpace = Pick<SpaceEntity, 'id' | 'defaultLocaleId'>;

/**
 * The rule every change of a space, its locales or its environments follows, in one transaction: the space's row
 * locked first, so changes of one space run one after the other and each reads what the previous one committed (a
 * service's check can be overtaken between its read and the write; `work` re-checks what must stay consistent against
 * the locked space); the change; then the space's `updated_at` (a change of locales or environments alone still
 * touches the space, with the values `work` returns) and a `spaces` event. `work` answers `false` when it found
 * nothing to change: no touch, no event. A space deleted meanwhile: nothing runs.
 */
export function changeSpace(
  db: Database,
  events: EventService,
  spaceId: string,
  tx: Transaction | undefined,
  work: (tx: Transaction, space: LockedSpace) => Promise<SpaceValues | false | void>,
): Promise<void> {
  return transaction(db, tx, async t => {
    const [space] = await t
      .select({ id: spaces.id, defaultLocaleId: spaces.defaultLocaleId })
      .from(spaces)
      .where(eq(spaces.id, spaceId))
      .for('update');
    if (!space) return;
    const values = await work(t, space);
    if (values !== false) await touchSpace(t, events, spaceId, values ?? {});
  });
}

async function touchSpace(tx: Transaction, events: EventService, spaceId: string, values: SpaceValues): Promise<void> {
  await tx
    .update(spaces)
    // Named: a change of locales or environments alone still touches the space.
    .set({ ...values, updatedAt: new Date() })
    .where(eq(spaces.id, spaceId));
  await events.publish({ spaceId: null, entity: 'spaces', id: spaceId, op: 'updated' }, tx);
}
