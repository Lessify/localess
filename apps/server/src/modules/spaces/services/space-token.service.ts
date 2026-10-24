import { type Page, type SpaceTokenCreate, type SpaceTokenPageable, type SpaceTokenUpdate, type Token, TokenType } from '@localess/shared';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import type { TokenEntity } from '../../../shared/entities/token.entity.js';
import { toToken } from '../../../shared/transformers/token.transformer.js';
import { newApiToken, tokenColumns } from '../../../shared/utils/api-token-format.js';
import { toPage } from '../../../shared/utils/paging.js';
import { SpaceRepository } from '../repositories/space.repository.js';
import { SpaceTokenRepository } from '../repositories/space-token.repository.js';

const NO_CACHE_FOR_MANAGEMENT = 'Management tokens are never cached: leave the cache TTL empty.';

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
    return toToken(await this.requireToken(spaceId, tokenId));
  }

  /** Answers the token with its value: the only time a management token's value is returned. */
  async create(spaceId: string, token: SpaceTokenCreate): Promise<Token> {
    if (token.type === TokenType.MANAGEMENT && token.cacheTtl != null) throw new BadRequestException(NO_CACHE_FOR_MANAGEMENT);
    await this.requireSpace(spaceId);
    const value = newApiToken(token.type);
    const tokenId = await this.spaceTokenRepository.create(spaceId, {
      type: token.type,
      name: token.name,
      cacheTtl: token.cacheTtl ?? null,
      ...tokenColumns(token.type, value),
    });
    return { ...toToken(await this.findToken(spaceId, tokenId)), token: value };
  }

  /** The name and the cache TTL; a management token takes no TTL (its type never changes, so it is read before). */
  async update(spaceId: string, tokenId: string, token: SpaceTokenUpdate): Promise<Token> {
    const current = await this.requireToken(spaceId, tokenId);
    if (current.type === 'management' && token.cacheTtl != null) throw new BadRequestException(NO_CACHE_FOR_MANAGEMENT);
    await this.spaceTokenRepository.update(spaceId, tokenId, { name: token.name, cacheTtl: token.cacheTtl ?? null });
    return toToken(await this.findToken(spaceId, tokenId));
  }

  /** The same token (id, type, name) under a new value of its type, returned once. */
  async regenerate(spaceId: string, tokenId: string): Promise<Token> {
    const type = (await this.requireToken(spaceId, tokenId)).type as TokenType;
    const value = newApiToken(type);
    await this.spaceTokenRepository.update(spaceId, tokenId, tokenColumns(type, value));
    return { ...toToken(await this.findToken(spaceId, tokenId)), token: value };
  }

  async remove(spaceId: string, tokenId: string): Promise<void> {
    await this.requireToken(spaceId, tokenId);
    await this.spaceTokenRepository.delete(spaceId, tokenId);
  }

  /** The space first: its 404 comes before the token's. */
  private async requireToken(spaceId: string, tokenId: string): Promise<TokenEntity> {
    await this.requireSpace(spaceId);
    return this.findToken(spaceId, tokenId);
  }

  /** The token alone, the space already checked (the re-read after a write). */
  private async findToken(spaceId: string, tokenId: string): Promise<TokenEntity> {
    const token = await this.spaceTokenRepository.findOne(spaceId, tokenId);
    if (!token) throw new NotFoundException('Token not found');
    return token;
  }

  private async requireSpace(spaceId: string): Promise<void> {
    if (!(await this.spaceRepository.exists(spaceId))) throw new NotFoundException('Space not found');
  }
}
