import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../../infra/database/database.module.js';
import { tokens } from '../../infra/database/schema.js';
import type { ApiToken } from '../utils/api-token.js';

/** Space API tokens as the public APIs check them: read only (the tokens module manages them). */
@Injectable()
export class ApiTokensRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** The token whose value hashes to `tokenHash` in this space. */
  async findByHash(spaceId: string, tokenHash: string): Promise<ApiToken | undefined> {
    const [row] = await this.db
      .select({ id: tokens.id, type: tokens.type, cacheTtl: tokens.cacheTtl })
      .from(tokens)
      .where(and(eq(tokens.spaceId, spaceId), eq(tokens.tokenHash, tokenHash)));
    return row as ApiToken | undefined;
  }
}
