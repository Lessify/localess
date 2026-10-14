import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { z } from 'zod';
import { TokenType, UserPermission } from '@localess/shared';
import { RequirePermission } from '../../../auth/decorators.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import { ZodValidationPipe } from '../../../infra/http/zod-validation.pipe.js';
import { TokensService } from '../services/tokens.service.js';

const createSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    type: z.enum(TokenType),
    cacheTtl: z.number().int().min(0).max(31_536_000).nullish(),
  })
  .strict();
// The type can't change: a `type` key is a 400.
const updateSchema = createSchema.omit({ type: true }).strict();
const TOKEN_TYPES: readonly string[] = Object.values(TokenType);

/**
 * Space API tokens. Routes use the UUID `id`; the value is `token`, which only this controller returns (to
 * SPACE_MANAGEMENT users), and for management tokens only once.
 */
@Controller('api/app/spaces/:spaceId/tokens')
@RequirePermission(UserPermission.SPACE_MANAGEMENT)
export class TokensController {
  constructor(private readonly tokens: TokensService) {}

  /** `?type=` keeps tokens of that type; `?limit=` caps the list (newest first). */
  @Get()
  list(@Param('spaceId') spaceId: string, @Query('type') type?: string, @Query('limit') limit?: string) {
    if (type !== undefined && !TOKEN_TYPES.includes(type)) throw new BadRequestException('Unknown token type');
    return this.tokens.list(spaceId, type as TokenType | undefined, limit ? Math.max(1, Math.min(1000, Number(limit) || 1)) : undefined);
  }

  @Get(':id')
  get(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string) {
    return this.tokens.get(spaceId, id);
  }

  @Post()
  create(@Param('spaceId') spaceId: string, @Body(new ZodValidationPipe(createSchema)) body: z.infer<typeof createSchema>) {
    return this.tokens.create(spaceId, body);
  }

  @Put(':id')
  update(
    @Param('spaceId') spaceId: string,
    @Param('id', UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(updateSchema)) body: z.infer<typeof updateSchema>,
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
