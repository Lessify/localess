import { TokenType } from '@localess/shared';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import type { TokenEntity } from '../../../shared/entities/token.entity.js';
import { toToken } from '../../../shared/transformers/token.transformer.js';
import { newApiToken, tokenColumns } from '../../../shared/utils/api-token-format.js';
import { TokenRepository } from '../repositories/token.repository.js';

export interface TokenInput {
  name: string;
  type: TokenType;
  cacheTtl?: number | null;
}

/** What an edit may change: the type never changes (the value's prefix names it). */
export type TokenChange = Omit<TokenInput, 'type'>;

const NO_CACHE_FOR_MANAGEMENT = 'Management tokens are never cached: leave the cache TTL empty.';

function found(entity: TokenEntity | undefined) {
  if (!entity) throw new NotFoundException('Token not found');
  return toToken(entity);
}

/** Space API tokens. The value is returned on create and regenerate; afterwards only for public and preview tokens. */
@Injectable()
export class TokenService {
  constructor(private readonly tokenRepository: TokenRepository) {}

  async findAll(spaceId: string, type?: TokenType, limit?: number) {
    return (await this.tokenRepository.findAll(spaceId, { type, limit })).map(toToken);
  }

  async findOne(spaceId: string, id: string) {
    return found(await this.tokenRepository.findById(spaceId, id));
  }

  async create(spaceId: string, input: TokenInput) {
    if (input.type === TokenType.MANAGEMENT && input.cacheTtl != null) throw new BadRequestException(NO_CACHE_FOR_MANAGEMENT);
    const value = newApiToken(input.type);
    const entity = await this.tokenRepository.create(spaceId, {
      type: input.type,
      name: input.name,
      cacheTtl: input.cacheTtl ?? null,
      ...tokenColumns(input.type, value),
    });
    if (!entity) throw new NotFoundException('Space not found');
    return { ...toToken(entity), token: value };
  }

  async update(spaceId: string, id: string, input: TokenChange) {
    return found(
      await this.tokenRepository.update(spaceId, id, current => {
        if (current.type === 'management' && input.cacheTtl != null) throw new BadRequestException(NO_CACHE_FOR_MANAGEMENT);
        return { name: input.name, cacheTtl: input.cacheTtl ?? null };
      }),
    );
  }

  /** The same token (id, type, name) under a new value, returned once. */
  async regenerate(spaceId: string, id: string) {
    let value = '';
    const entity = await this.tokenRepository.update(spaceId, id, current => {
      const type = current.type as TokenType;
      value = newApiToken(type);
      return tokenColumns(type, value);
    });
    return { ...found(entity), token: value };
  }

  async remove(spaceId: string, id: string): Promise<void> {
    if (!(await this.tokenRepository.delete(spaceId, id))) throw new NotFoundException('Token not found');
  }
}
