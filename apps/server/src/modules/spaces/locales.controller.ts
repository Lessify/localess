import { Controller, Get, Inject } from '@nestjs/common';
import { asc } from 'drizzle-orm';
import { RequireAnyRole } from '../../auth/decorators.js';
import { DATABASE, type Database } from '../../infra/database/database.module.js';
import { locales } from '../../infra/database/schema.js';

/** Every locale a space can add. Read-only: the list is database data, seeded and changed by migrations. */
@Controller('api/app/locales')
export class LocalesController {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  @Get()
  @RequireAnyRole()
  list() {
    return this.db.select().from(locales).orderBy(asc(locales.name), asc(locales.id));
  }
}
