import type { Token, TokenType } from '@localess/shared';

import type { TokenEntity } from '../entities/token.entity.js';

/**
 * A token as the App API returns it (developers only): no hash, no `spaceId`; a management token has no `token`
 * (it is shown once, by the create and regenerate answers), and no `cacheTtl` when it uses the default.
 */
export function toToken(entity: TokenEntity): Token {
  const token: Token = {
    id: entity.id,
    type: entity.type as TokenType,
    name: entity.name,
    hint: entity.hint,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
  if (entity.token !== null) token.token = entity.token;
  if (entity.cacheTtl !== null) token.cacheTtl = entity.cacheTtl;
  return token;
}
