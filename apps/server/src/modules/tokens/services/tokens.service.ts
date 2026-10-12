import { Injectable, NotFoundException } from '@nestjs/common';
import type { TokenPermission } from '@localess/shared';
import { newTokenSecret } from '../../../infra/database/id.js';
import { toToken } from '../../../shared/transformers/token.transformer.js';
import { type TokenEntity, TokensRepository } from '../repositories/tokens.repository.js';

export interface TokenInput {
  name: string;
  permissions: TokenPermission[];
  cacheTtl?: number | null;
}

function found(entity: TokenEntity | undefined) {
  if (!entity) throw new NotFoundException('Token not found');
  return toToken(entity);
}

/** Space API tokens (was `spaces/{s}/tokens`). New and changed tokens are V2; the secret is `token`. */
@Injectable()
export class TokensService {
  constructor(private readonly tokens: TokensRepository) {}

  async list(spaceId: string, permission?: string, limit?: number) {
    return (await this.tokens.findAll(spaceId, { permission, limit })).map(toToken);
  }

  async get(spaceId: string, id: string) {
    return found(await this.tokens.findById(spaceId, id));
  }

  async create(spaceId: string, input: TokenInput) {
    const entity = await this.tokens.create(spaceId, {
      token: newTokenSecret(),
      name: input.name,
      permissions: input.permissions,
      cacheTtl: input.cacheTtl ?? null,
    });
    if (!entity) throw new NotFoundException('Space not found');
    return toToken(entity);
  }

  async update(spaceId: string, id: string, input: TokenInput) {
    return found(
      await this.tokens.update(spaceId, id, () => ({
          name: input.name,
        permissions: input.permissions,
        cacheTtl: input.cacheTtl ?? null,
      })),
    );
  }

  /** Same token (same id, name and permissions) under a new secret. */
  async regenerate(spaceId: string, id: string) {
    return found(await this.tokens.update(spaceId, id, () => ({ token: newTokenSecret() })));
  }

  async delete(spaceId: string, id: string): Promise<void> {
    if (!(await this.tokens.delete(spaceId, id))) throw new NotFoundException('Token not found');
  }
}
