import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { locales } from '../../../infra/database/schema.js';
import type { LocaleEntity } from '../../../shared/entities/locale.entity.js';

/** Every locale a space can add: database data, seeded and changed by migrations. */
@Injectable()
export class LocaleRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  findAll(): Promise<LocaleEntity[]> {
    return this.db.query.locales.findMany({ orderBy: [asc(locales.name), asc(locales.id)] });
  }

  async exists(localeId: string): Promise<boolean> {
    return (await this.db.$count(locales, eq(locales.id, localeId))) > 0;
  }
}
