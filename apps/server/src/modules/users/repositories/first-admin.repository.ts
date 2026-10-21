import { DEFAULT_LOCALE } from '@localess/shared';
import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { newUuid } from '../../../infra/database/id.js';
import { spaceLocales, spaces, userCredentials, users } from '../../../infra/database/schema.js';
import { type Transaction, transaction } from '../../../infra/database/transaction.js';
import { createPreviewToken } from '../../../shared/data-rules/space-tokens.js';

/**
 * The first administrator and the starter space. Needs the database only (no events): the CLI (`admin:create`) runs
 * it without the HTTP app.
 */
@Injectable()
export class FirstAdminRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  countUsers(): Promise<number> {
    return this.db.$count(users);
  }

  /** Case-insensitive. */
  async existsEmail(email: string): Promise<boolean> {
    return (await this.db.$count(users, sql`lower(${users.email}) = ${email.toLowerCase()}`)) > 0;
  }

  /** The admin with an argon2id password, and the "Hello World" space with the default locale and its preview token, in one transaction. */
  createWithStarterSpace(
    admin: { email: string; displayName: string; passwordHash: string },
    tx?: Transaction,
  ): Promise<{ userId: string; spaceId: string }> {
    return transaction(this.db, tx, async t => {
      const [user] = await t
        .insert(users)
        .values({
          id: newUuid(),
          email: admin.email,
          emailVerified: true,
          displayName: admin.displayName,
          role: 'ADMIN',
        })
        .returning({ id: users.id });
      await t.insert(userCredentials).values({ userId: user.id, passwordHash: admin.passwordHash, hashAlgo: 'argon2id' });
      const spaceId = newUuid();
      await t.insert(spaces).values({ id: spaceId, name: 'Hello World', defaultLocaleId: DEFAULT_LOCALE.id });
      await t.insert(spaceLocales).values({ spaceId, localeId: DEFAULT_LOCALE.id, position: 0 });
      await createPreviewToken(t, spaceId);
      return { userId: user.id, spaceId };
    });
  }
}
