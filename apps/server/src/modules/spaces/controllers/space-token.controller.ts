import { type SpaceTokenCreate, type SpaceTokenUpdate, type Token, TokenType, UserPermission } from '@localess/shared';
import { zSpaceTokenCreate, zSpaceTokenUpdate } from '@localess/shared/zod';
import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';

import { RequirePermission } from '../../../auth/decorators.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import { SpaceTokenService } from '../services/space-token.service.js';

const TOKEN_TYPES: readonly string[] = Object.values(TokenType);

/**
 * Space API tokens. Routes use the UUID `id`; the value is `token`, which only this controller returns (to
 * SPACE_MANAGEMENT users), and for management tokens only once.
 */
@Controller('api/app/spaces/:spaceId/tokens')
@RequirePermission(UserPermission.SPACE_MANAGEMENT)
export class SpaceTokenController {
  constructor(private readonly spaceTokenService: SpaceTokenService) {}

  /** `?type=` keeps tokens of that type; `?limit=` caps the list (newest first). */
  @Get()
  findAll(@Param('spaceId') spaceId: string, @Query('type') type?: string, @Query('limit') limit?: string): Promise<Token[]> {
    if (type !== undefined && !TOKEN_TYPES.includes(type)) throw new BadRequestException('Unknown token type');
    return this.spaceTokenService.findAll(
      spaceId,
      type as TokenType | undefined,
      limit ? Math.max(1, Math.min(1000, Number(limit) || 1)) : undefined,
    );
  }

  @Get(':id')
  findOne(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string): Promise<Token> {
    return this.spaceTokenService.findOne(spaceId, id);
  }

  @Post()
  create(@Param('spaceId') spaceId: string, @Body({ schema: zSpaceTokenCreate }) body: SpaceTokenCreate): Promise<Token> {
    return this.spaceTokenService.create(spaceId, body);
  }

  @Put(':id')
  update(
    @Param('spaceId') spaceId: string,
    @Param('id', UuidParamPipe) id: string,
    @Body({ schema: zSpaceTokenUpdate }) body: SpaceTokenUpdate,
  ): Promise<Token> {
    return this.spaceTokenService.update(spaceId, id, body);
  }

  @Post(':id/regenerate')
  regenerate(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string): Promise<Token> {
    return this.spaceTokenService.regenerate(spaceId, id);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string): Promise<void> {
    await this.spaceTokenService.remove(spaceId, id);
  }
}
