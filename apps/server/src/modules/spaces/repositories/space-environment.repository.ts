import { Inject, Injectable } from '@nestjs/common';
import { and, eq, max } from 'drizzle-orm';
import type { SpaceEnvironmentCreate, SpaceEnvironmentUpdate } from '@localess/shared';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { newUuid } from '../../../infra/database/id.js';
import { keepUpdatedAt, spaceEnvironments } from '../../../infra/database/schema.js';
import type { Transaction } from '../../../infra/database/transaction.js';
import { EventService } from '../../../infra/events/event.service.js';
import type { SpaceRow } from '../../../shared/queries/space.query.js';
import { changeSpace, changeSpaceIfFound } from './space-change.js';

/** A space's environments (`space_environments`); every change touches the space and announces it (`changeSpace`). */
@Injectable()
export class SpaceEnvironmentRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly eventService: EventService,
  ) {}

  /** At the end of the space's list. */
  create(spaceId: string, environment: SpaceEnvironmentCreate, tx?: Transaction): Promise<SpaceRow> {
    return changeSpace(this.db, this.eventService, spaceId, tx, async t => {
      const [{ last }] = await t
        .select({ last: max(spaceEnvironments.position) })
        .from(spaceEnvironments)
        .where(eq(spaceEnvironments.spaceId, spaceId));
      await t.insert(spaceEnvironments).values({ id: newUuid(), spaceId, ...environment, position: (last ?? -1) + 1 });
    });
  }

  /** `undefined` when the space has no environment `environmentId`. */
  update(spaceId: string, environmentId: string, environment: SpaceEnvironmentUpdate, tx?: Transaction): Promise<SpaceRow | undefined> {
    return changeSpaceIfFound(this.db, this.eventService, spaceId, tx, async t => {
      const updated = await t
        .update(spaceEnvironments)
        .set(environment)
        .where(this.environment(spaceId, environmentId))
        .returning({ id: spaceEnvironments.id });
      return updated.length > 0;
    });
  }

  /** `undefined` when the space has no environment `environmentId`. */
  delete(spaceId: string, environmentId: string, tx?: Transaction): Promise<SpaceRow | undefined> {
    return changeSpaceIfFound(this.db, this.eventService, spaceId, tx, async t => {
      const deleted = await t
        .delete(spaceEnvironments)
        .where(this.environment(spaceId, environmentId))
        .returning({ id: spaceEnvironments.id });
      return deleted.length > 0;
    });
  }

  /** `environmentIds`: every environment of the space, in the new order. */
  reorder(spaceId: string, environmentIds: string[], tx?: Transaction): Promise<SpaceRow> {
    return changeSpace(this.db, this.eventService, spaceId, tx, async t => {
      for (const [position, id] of environmentIds.entries()) {
        await t
          .update(spaceEnvironments)
          .set({ position, ...keepUpdatedAt(spaceEnvironments) })
          .where(this.environment(spaceId, id));
      }
    });
  }

  private environment(spaceId: string, environmentId: string) {
    return and(eq(spaceEnvironments.spaceId, spaceId), eq(spaceEnvironments.id, environmentId));
  }
}
