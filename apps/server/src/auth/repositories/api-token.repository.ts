import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { DATABASE, type Database } from '../../infra/database/database.module.js';
import { firebaseImports, tokens } from '../../infra/database/schema.js';
import { importStatusOf, type SpaceImportStatus } from '../../shared/utils/import-status.js';
import type { ApiToken } from '../utils/api-token.js';

/** Space API tokens as the public APIs check them: read only (the tokens module manages them). */
@Injectable()
export class ApiTokenRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** The token whose value hashes to `tokenHash` in this space. */
  async findByHash(spaceId: string, tokenHash: string): Promise<ApiToken | undefined> {
    const [row] = await this.db
      .select({ id: tokens.id, type: tokens.type, cacheTtl: tokens.cacheTtl })
      .from(tokens)
      .where(and(eq(tokens.spaceId, spaceId), eq(tokens.tokenHash, tokenHash)));
    return row as ApiToken | undefined;
  }

  /** Whether the space's import from Firebase runs or failed (`null`: no import, or finished). */
  async findImportStatus(spaceId: string): Promise<SpaceImportStatus | null> {
    const [row] = await this.db
      .select({ importStatus: importStatusOf(firebaseImports.status) })
      .from(firebaseImports)
      .where(eq(firebaseImports.spaceId, spaceId));
    return row?.importStatus ?? null;
  }
}
