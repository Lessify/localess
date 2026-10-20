import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, ilike, max, or, sql, type SQL } from 'drizzle-orm';
import type { SpaceEnvironmentCreate, SpaceEnvironmentPageable, SpaceEnvironmentUpdate } from '@localess/shared';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { newUuid } from '../../../infra/database/id.js';
import { keepUpdatedAt, spaceEnvironments } from '../../../infra/database/schema.js';
import type { Transaction } from '../../../infra/database/transaction.js';
import { EventService } from '../../../infra/events/event.service.js';
import type { SpaceEnvironmentEntity } from '../../../shared/entities/space-environment.entity.js';
import { containsPattern, offsetOf } from '../../../shared/utils/paging.js';
import { moveTo } from '../utils/move.js';
import { changeSpace } from './space-change.js';

/** A space's environments (`space_environments`); every change touches the space and announces it (`changeSpace`). */
@Injectable()
export class SpaceEnvironmentRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly eventService: EventService,
  ) {}

  /**
   * One page by the query's sort (`position`: the space's order; `name`, `url` case-insensitive), then the id so equal
   * values page stably.
   */
  findAll(spaceId: string, query: SpaceEnvironmentPageable): Promise<SpaceEnvironmentEntity[]> {
    const order = query.direction === 'desc' ? desc : asc;
    const column = {
      position: spaceEnvironments.position,
      name: sql`lower(${spaceEnvironments.name})`,
      url: sql`lower(${spaceEnvironments.url})`,
    }[query.sort];
    return this.db.query.spaceEnvironments.findMany({
      where: this.where(spaceId, query),
      orderBy: [order(column), asc(spaceEnvironments.id)],
      limit: query.size,
      offset: offsetOf(query),
    });
  }

  /** How many of the space's environments match the query's search. */
  findAllCount(spaceId: string, query: SpaceEnvironmentPageable): Promise<number> {
    return this.db.$count(spaceEnvironments, this.where(spaceId, query));
  }

  /** Every environment of the space, in its order (ties: the one added first), as `{ id, name, url }`. */
  findAllNames(spaceId: string): Promise<Pick<SpaceEnvironmentEntity, 'id' | 'name' | 'url'>[]> {
    return this.db.query.spaceEnvironments.findMany({
      columns: { id: true, name: true, url: true },
      where: eq(spaceEnvironments.spaceId, spaceId),
      orderBy: [asc(spaceEnvironments.position), asc(spaceEnvironments.createdAt)],
    });
  }

  findOne(spaceId: string, environmentId: string): Promise<SpaceEnvironmentEntity | undefined> {
    return this.db.query.spaceEnvironments.findFirst({ where: this.environment(spaceId, environmentId) });
  }

  /** At the end of the space's list; answers its id. */
  async create(spaceId: string, environment: SpaceEnvironmentCreate, tx?: Transaction): Promise<string> {
    const id = newUuid();
    await changeSpace(this.db, this.eventService, spaceId, tx, async t => {
      const [{ last }] = await t
        .select({ last: max(spaceEnvironments.position) })
        .from(spaceEnvironments)
        .where(eq(spaceEnvironments.spaceId, spaceId));
      await t.insert(spaceEnvironments).values({ id, spaceId, ...environment, position: (last ?? -1) + 1 });
    });
    return id;
  }

  update(spaceId: string, environmentId: string, environment: SpaceEnvironmentUpdate, tx?: Transaction): Promise<void> {
    return changeSpace(this.db, this.eventService, spaceId, tx, async t => {
      await t.update(spaceEnvironments).set(environment).where(this.environment(spaceId, environmentId));
    });
  }

  delete(spaceId: string, environmentId: string, tx?: Transaction): Promise<void> {
    return changeSpace(this.db, this.eventService, spaceId, tx, async t => {
      await t.delete(spaceEnvironments).where(this.environment(spaceId, environmentId));
    });
  }

  /**
   * The environment to `position` in the space's order, the others shifting (`moveTo`); only the rows that change are
   * written, their `updated_at` kept. The space's rows are locked while read, so two moves run one after the other.
   * Nothing written, no event, when it is already there or no longer there.
   */
  move(spaceId: string, environmentId: string, position: number, tx?: Transaction): Promise<void> {
    return changeSpace(this.db, this.eventService, spaceId, tx, async t => {
      const rows = await t
        .select({ id: spaceEnvironments.id, position: spaceEnvironments.position })
        .from(spaceEnvironments)
        .where(eq(spaceEnvironments.spaceId, spaceId))
        .orderBy(asc(spaceEnvironments.position), asc(spaceEnvironments.createdAt))
        .for('update');
      const changes = moveTo(rows, environmentId, position);
      if (!changes?.length) return false;
      for (const change of changes) {
        await t
          .update(spaceEnvironments)
          .set({ position: change.position, ...keepUpdatedAt(spaceEnvironments) })
          .where(this.environment(spaceId, change.id));
      }
      return {}; // the space touched alone
    });
  }

  private environment(spaceId: string, environmentId: string) {
    return and(eq(spaceEnvironments.spaceId, spaceId), eq(spaceEnvironments.id, environmentId));
  }

  /** The space's environments, and the query's search (the name or the URL). */
  private where(spaceId: string, query: SpaceEnvironmentPageable): SQL | undefined {
    const conditions: SQL[] = [eq(spaceEnvironments.spaceId, spaceId)];
    if (query.search) {
      const pattern = containsPattern(query.search);
      conditions.push(or(ilike(spaceEnvironments.name, pattern), ilike(spaceEnvironments.url, pattern)) as SQL);
    }
    return and(...conditions);
  }
}
