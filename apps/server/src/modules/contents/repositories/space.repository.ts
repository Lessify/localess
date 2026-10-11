import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { findSpace, type SpaceRow } from '../../../shared/queries/space.query.js';

/** The space as content delivery needs it: its locales, default locale and content version (`cv`). */
@Injectable()
export class SpaceRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  find(spaceId: string): Promise<SpaceRow | undefined> {
    return findSpace(this.db, spaceId);
  }
}
