import { type Page, type SpaceTokenCreate, type SpaceTokenPageable, type SpaceTokenUpdate, type Token, TokenType } from '@localess/shared';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import type { TokenEntity } from '../../../shared/entities/token.entity.js';
import { toToken } from '../../../shared/transformers/token.transformer.js';
import { newApiToken, tokenColumns } from '../../../shared/utils/api-token-format.js';
import { toPage } from '../../../shared/utils/paging.js';
import { SpaceRepository } from '../repositories/space.repository.js';
import { SpaceTokenRepository } from '../repositories/space-token.repository.js';

const NO_CACHE_FOR_MANAGEMENT = 'Management tokens are never cached: leave the cache TTL empty.';

function found(entity: TokenEntity | undefined): Token {
  if (!entity) throw new NotFoundException('Token not found');
  return toToken(entity);
}

/**
 * A space's API tokens. The value is returned on create and regenerate; afterwards only for public and preview tokens.
 * Every route checks the space first (404 "Space not found" before "Token not found").
 */
@Injectable()
export class SpaceTokenService {
  constructor(
    private readonly spaceRepository: SpaceRepository,
    private readonly spaceTokenRepository: SpaceTokenRepository,
  ) {}

  /** One page, newest first unless sorted otherwise. */
  async findAll(spaceId: string, query: SpaceTokenPageable): Promise<Page<Token>> {
    await this.requireSpace(spaceId);
    const [rows, total] = await Promise.all([
      this.spaceTokenRepository.findAll(spaceId, query),
      this.spaceTokenRepository.findAllCount(spaceId, query),
    ]);
    return toPage(rows, total, query, toToken);
  }

  async findOne(spaceId: string, tokenId: string): Promise<Token> {
    await this.requireSpace(spaceId);
    return found(await this.spaceTokenRepository.findById(spaceId, tokenId));
  }

  async create(spaceId: string, token: SpaceTokenCreate): Promise<Token> {
    if (token.type === TokenType.MANAGEMENT && token.cacheTtl != null) throw new BadRequestException(NO_CACHE_FOR_MANAGEMENT);
    await this.requireSpace(spaceId);
    const value = newApiToken(token.type);
    const entity = await this.spaceTokenRepository.create(spaceId, {
      type: token.type,
      name: token.name,
      cacheTtl: token.cacheTtl ?? null,
      ...tokenColumns(token.type, value),
    });
    return { ...toToken(entity), token: value };
  }

  async update(spaceId: string, tokenId: string, token: SpaceTokenUpdate): Promise<Token> {
    await this.requireSpace(spaceId);
    return found(
      await this.spaceTokenRepository.update(spaceId, tokenId, current => {
        if (current.type === 'management' && token.cacheTtl != null) throw new BadRequestException(NO_CACHE_FOR_MANAGEMENT);
        return { name: token.name, cacheTtl: token.cacheTtl ?? null };
      }),
    );
  }

  /** The same token (id, type, name) under a new value, returned once. */
  async regenerate(spaceId: string, tokenId: string): Promise<Token> {
    await this.requireSpace(spaceId);
    let value = '';
    const entity = await this.spaceTokenRepository.update(spaceId, tokenId, current => {
      const type = current.type as TokenType;
      value = newApiToken(type);
      return tokenColumns(type, value);
    });
    return { ...found(entity), token: value };
  }

  async remove(spaceId: string, tokenId: string): Promise<void> {
    await this.requireSpace(spaceId);
    if (!(await this.spaceTokenRepository.delete(spaceId, tokenId))) throw new NotFoundException('Token not found');
  }

  private async requireSpace(spaceId: string): Promise<void> {
    if (!(await this.spaceRepository.exists(spaceId))) throw new NotFoundException('Space not found');
  }
}
