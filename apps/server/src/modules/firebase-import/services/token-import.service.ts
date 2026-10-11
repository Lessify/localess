import { Injectable } from '@nestjs/common';
import { TokenPermission } from '@localess/shared';
import { newUuid } from '../../../infra/database/id.js';
import { TokenImportRepository } from '../repositories/token-import.repository.js';
import { knownValues, str, timestamps } from '../utils/firebase-docs.js';
import { type ImportStage, StageFailure } from '../utils/firebase-import.utils.js';

/** Stage 4: the API tokens, with their token values (so existing sites keep working). */
@Injectable()
export class TokenImportService {
  constructor(private readonly tokens: TokenImportRepository) {}

  /** Fails when a token value already exists in another space. Answers the count. */
  async import(stage: ImportStage): Promise<number> {
    const tokenDocs = await stage.client.list(stage.sourceSpaceId, 'tokens');
    for (const doc of tokenDocs) {
      const taken = await this.tokens.findSpaceNameByToken(doc.id);
      if (taken) throw new StageFailure('tokens', `Token '${str(doc['name']) ?? doc.id}' already exists in space '${taken}'`);
      const permissions = knownValues(TokenPermission, doc['permissions']);
      for (const it of permissions.dropped) stage.warn(`${str(doc['name']) ?? doc.id}: unknown permission ${it}, dropped`);
      await this.tokens.insert({
        id: newUuid(timestamps(doc).createdAt),
        spaceId: stage.spaceId,
        token: doc.id,
        name: str(doc['name']) ?? 'Token',
        version: typeof doc['version'] === 'number' ? doc['version'] : null,
        permissions: Array.isArray(doc['permissions']) ? permissions.kept : null,
        cacheTtl: typeof doc['cacheTtl'] === 'number' ? doc['cacheTtl'] : null,
        ...timestamps(doc),
      });
    }
    return tokenDocs.length;
  }
}
