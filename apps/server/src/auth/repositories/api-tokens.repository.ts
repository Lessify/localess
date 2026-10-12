import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { TokenPermission } from '@localess/shared';
import { DATABASE, type Database } from '../../infra/database/database.module.js';
import { tokens } from '../../infra/database/schema.js';
import type { ApiToken } from '../utils/api-token.js';

/** Space API tokens as the public /api/v1 checks them: read only (the tokens module manages them). */
@Injectable()
export class ApiTokensRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** The token whose secret is `token` in this space. */
  async find(spaceId: string, token: string): Promise<ApiToken | undefined> {
    const [row] = await this.db
      .select({ id: tokens.id, permissions: tokens.permissions, cacheTtl: tokens.cacheTtl })
      .from(tokens)
      .where(and(eq(tokens.spaceId, spaceId), eq(tokens.token, token)));
    return row ? { ...row, permissions: row.permissions as TokenPermission[] } : undefined;
  }
}
