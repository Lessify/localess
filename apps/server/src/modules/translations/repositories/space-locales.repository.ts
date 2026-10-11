import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { isUuid } from '../../../infra/database/id.js';
import { spaces } from '../../../infra/database/schema.js';
import { selectSpaces, type SpaceRow } from '../../../shared/queries/space.query.js';

/** The space as translations need it: which locales values may be written for, and the default locale gaps fill from. */
@Injectable()
export class SpaceLocalesRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async find(spaceId: string): Promise<SpaceRow | undefined> {
    if (!isUuid(spaceId)) return undefined;
    const [space] = await selectSpaces(this.db).where(eq(spaces.id, spaceId));
    return space;
  }

  async require(spaceId: string): Promise<SpaceRow> {
    const space = await this.find(spaceId);
    if (!space) throw new NotFoundException('Space not found');
    return space;
  }
}
