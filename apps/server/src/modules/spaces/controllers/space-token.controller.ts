import { DEVELOPERS, type Page, type SpaceTokenCreate, type SpaceTokenPageable, type SpaceTokenUpdate, type Token } from '@localess/shared';
import { zSpaceTokenCreate, zSpaceTokenPageable, zSpaceTokenUpdate } from '@localess/shared/zod';
import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';

import { RequireRole } from '../../../auth/decorators.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import { SpaceTokenService } from '../services/space-token.service.js';

/**
 * A space's API tokens. Routes use the UUID `tokenId`; the value is `token`, which only this controller returns (to
 * developers), and for management tokens only once.
 */
@Controller('api/app/spaces/:spaceId/tokens')
@RequireRole(DEVELOPERS)
export class SpaceTokenController {
  constructor(private readonly spaceTokenService: SpaceTokenService) {}

  /** One page for Space Settings → Tokens: `?page=&size=&sort=&direction=` (Pageable), `?type=`, `?search=` (name or hint). */
  @Get()
  findAll(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Query({ schema: zSpaceTokenPageable }) query: SpaceTokenPageable,
  ): Promise<Page<Token>> {
    return this.spaceTokenService.findAll(spaceId, query);
  }

  @Get(':tokenId')
  findOne(@Param('spaceId', UuidParamPipe) spaceId: string, @Param('tokenId', UuidParamPipe) tokenId: string): Promise<Token> {
    return this.spaceTokenService.findOne(spaceId, tokenId);
  }

  @Post()
  create(@Param('spaceId', UuidParamPipe) spaceId: string, @Body({ schema: zSpaceTokenCreate }) body: SpaceTokenCreate): Promise<Token> {
    return this.spaceTokenService.create(spaceId, body);
  }

  @Put(':tokenId')
  update(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Param('tokenId', UuidParamPipe) tokenId: string,
    @Body({ schema: zSpaceTokenUpdate }) body: SpaceTokenUpdate,
  ): Promise<Token> {
    return this.spaceTokenService.update(spaceId, tokenId, body);
  }

  @Post(':tokenId/regenerate')
  regenerate(@Param('spaceId', UuidParamPipe) spaceId: string, @Param('tokenId', UuidParamPipe) tokenId: string): Promise<Token> {
    return this.spaceTokenService.regenerate(spaceId, tokenId);
  }

  @Delete(':tokenId')
  @HttpCode(204)
  async remove(@Param('spaceId', UuidParamPipe) spaceId: string, @Param('tokenId', UuidParamPipe) tokenId: string): Promise<void> {
    await this.spaceTokenService.remove(spaceId, tokenId);
  }
}
