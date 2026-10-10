import { Controller, Get, Req, Res } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { TokenAuthService } from '../../auth/api-tokens/token-auth.service.js';
import { Public } from '../../auth/decorators.js';
import { CACHE_MAX_AGE, CACHE_SHARE_MAX_AGE, publicCache } from '../../infra/http/v1/cache-control.js';
import { Params } from '../../infra/http/v1/v1-request.js';
import { sendV1Error } from '../../infra/http/v1/v1-response.js';
import { SpacesService } from './spaces.service.js';

/** The space itself on the public API, for developers (DEV_TOOLS `?token=`). Ported from functions/src/v1/dev-tools.ts. */
@Public()
@Controller('api/v1/spaces/:spaceId')
export class SpacesPublicController {
  constructor(
    private readonly spaces: SpacesService,
    private readonly tokens: TokenAuthService,
  ) {}

  @Get()
  async space(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<void> {
    if (!(await this.tokens.authorizeDevTools(request, reply))) return;
    const space = await this.spaces.findSpace((request.params as Params)['spaceId']);
    if (!space) {
      sendV1Error(reply, 404, 'not-found', 'Not found', { cacheControl: publicCache(CACHE_MAX_AGE, CACHE_SHARE_MAX_AGE) });
      return;
    }
    void reply.send({
      id: space.id,
      name: space.name,
      locales: space.locales,
      defaultLocale: space.defaultLocale,
      createdAt: space.createdAt.toISOString(),
      updatedAt: space.updatedAt.toISOString(),
    });
  }
}
