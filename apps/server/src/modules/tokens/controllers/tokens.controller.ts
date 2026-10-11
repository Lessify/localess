import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { z } from 'zod';
import { TokenPermission, UserPermission } from '@localess/shared';
import { RequirePermission } from '../../../auth/decorators.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import { ZodValidationPipe } from '../../../infra/http/zod-validation.pipe.js';
import { TokensService } from '../services/tokens.service.js';

const tokenSchema = z.object({
  name: z.string().trim().min(1).max(200),
  permissions: z.array(z.enum(Object.values(TokenPermission) as [TokenPermission, ...TokenPermission[]])).max(10),
  cacheTtl: z.number().int().min(0).max(31_536_000).nullish(),
});

/**
 * Space API tokens. Routes use the UUID `id`; the secret is `token`, which only this controller returns (to
 * SPACE_MANAGEMENT users).
 */
@Controller('api/app/spaces/:spaceId/tokens')
@RequirePermission(UserPermission.SPACE_MANAGEMENT)
export class TokensController {
  constructor(private readonly tokens: TokensService) {}

  /** `?permission=X` keeps tokens carrying it; `?limit=` caps the list (newest first). */
  @Get()
  list(@Param('spaceId') spaceId: string, @Query('permission') permission?: string, @Query('limit') limit?: string) {
    return this.tokens.list(spaceId, permission, limit ? Math.max(1, Math.min(1000, Number(limit) || 1)) : undefined);
  }

  @Get(':id')
  get(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string) {
    return this.tokens.get(spaceId, id);
  }

  @Post()
  create(@Param('spaceId') spaceId: string, @Body(new ZodValidationPipe(tokenSchema)) body: z.infer<typeof tokenSchema>) {
    return this.tokens.create(spaceId, body);
  }

  @Put(':id')
  update(
    @Param('spaceId') spaceId: string,
    @Param('id', UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(tokenSchema)) body: z.infer<typeof tokenSchema>,
  ) {
    return this.tokens.update(spaceId, id, body);
  }

  @Post(':id/regenerate')
  regenerate(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string) {
    return this.tokens.regenerate(spaceId, id);
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string): Promise<void> {
    await this.tokens.delete(spaceId, id);
  }
}
