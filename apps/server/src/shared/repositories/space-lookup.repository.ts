import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../../infra/database/database.module.js';
import { isUuid } from '../../infra/database/id.js';
import { spaceLocales, spaces } from '../../infra/database/schema.js';
import type { Transaction } from '../../infra/database/transaction.js';
import type { SpaceWithLocales } from '../entities/space.entity.js';

/**
 * The space as every module reads it: whether it exists, and with its default locale and its locales for the rules
 * that need them (a value only for a space locale, the fallback to the default). Reads only; the Spaces module writes
 * spaces. Inside a transaction, pass it: the read sees the transaction's rows and locks.
 */
@Injectable()
export class SpaceLookupRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** False for an id that is not a UUID (a legacy id is resolved before a controller sees it). */
  async exists(spaceId: string, tx?: Transaction): Promise<boolean> {
    if (!isUuid(spaceId)) return false;
    const space = await (tx ?? this.db).query.spaces.findFirst({ where: eq(spaces.id, spaceId), columns: { id: true } });
    return space !== undefined;
  }

  /** The space with its default locale and its locales in position order (ties: the one added first). */
  async findOne(spaceId: string, tx?: Transaction): Promise<SpaceWithLocales | undefined> {
    if (!isUuid(spaceId)) return undefined;
    return (tx ?? this.db).query.spaces.findFirst({
      where: eq(spaces.id, spaceId),
      with: {
        defaultLocale: true,
        spaceLocales: { orderBy: [asc(spaceLocales.position), asc(spaceLocales.createdAt)], with: { locale: true } },
      },
    });
  }
}
