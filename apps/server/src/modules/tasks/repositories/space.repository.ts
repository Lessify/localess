import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { requireSpace, type SpaceRow } from '../../../shared/queries/space.query.js';

/** The space a task belongs to: checked before an upload is stored, and its locales for translation imports. */
@Injectable()
export class SpaceRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** The space, or a 404. */
  require(spaceId: string): Promise<SpaceRow> {
    return requireSpace(this.db, spaceId);
  }
}
