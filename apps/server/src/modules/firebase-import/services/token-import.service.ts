import { Injectable } from '@nestjs/common';
import { TokenPermission } from '@localess/shared';
import { newUuid } from '../../../infra/database/id.js';
import { TokenImportRepository } from '../repositories/token-import.repository.js';
import { knownValues, str, timestamps } from '../utils/firebase-docs.js';
import { type ImportStage, StageFailure } from '../utils/firebase-import.utils.js';

/** What a Firebase V1 token (no `version`, no stored permissions) could do: read translations and content, published and draft. */
const V1_PERMISSIONS: TokenPermission[] = [
  TokenPermission.TRANSLATION_PUBLIC,
  TokenPermission.TRANSLATION_DRAFT,
  TokenPermission.CONTENT_PUBLIC,
  TokenPermission.CONTENT_DRAFT,
];

/**
 * Stage 4: the API tokens, with their token values (so existing sites keep working), all in the one current form: a V1
 * token gets the permissions it had implicitly (and the default redirect cache, as V1 had).
 */
@Injectable()
export class TokenImportService {
  constructor(private readonly tokens: TokenImportRepository) {}

  /** Fails when a token value already exists in another space. Answers the count. */
  async import(stage: ImportStage): Promise<number> {
    const tokenDocs = await stage.client.list(stage.sourceSpaceId, 'tokens');
    for (const doc of tokenDocs) {
      const taken = await this.tokens.findSpaceNameByToken(doc.id);
      if (taken) throw new StageFailure('tokens', `Token '${str(doc['name']) ?? doc.id}' already exists in space '${taken}'`);
      const isV2 = doc['version'] === 2;
      const permissions = knownValues(TokenPermission, doc['permissions']);
      for (const it of permissions.dropped) stage.warn(`${str(doc['name']) ?? doc.id}: unknown permission ${it}, dropped`);
      await this.tokens.insert({
        id: newUuid(timestamps(doc).createdAt),
        spaceId: stage.spaceId,
        token: doc.id,
        name: str(doc['name']) ?? 'Token',
        permissions: isV2 ? permissions.kept : V1_PERMISSIONS,
        cacheTtl: isV2 && typeof doc['cacheTtl'] === 'number' ? doc['cacheTtl'] : null,
        ...timestamps(doc),
      });
    }
    return tokenDocs.length;
  }
}
