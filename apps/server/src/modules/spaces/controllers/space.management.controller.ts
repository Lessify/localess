import { Controller, Get, Param, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { ManagementToken } from '../../../auth/token-auth.decorators.js';
import { sendV1Error } from '../../../infra/http/v1/v1-response.js';
import { SpaceService } from '../services/space.service.js';

/** The space itself on the Management API (`Authorization: Bearer` with a management token): the CLI's `localess login` check. */
@ManagementToken()
@Controller('api/manage/v1/spaces/:spaceId')
export class SpaceManagementController {
  constructor(private readonly spaces: SpaceService) {}

  @Get()
  async space(@Param('spaceId') spaceId: string, @Res() reply: FastifyReply): Promise<void> {
    const space = await this.spaces.findPublic(spaceId);
    if (!space) {
      sendV1Error(reply, 404, 'not-found', 'Not found', { cacheControl: 'no-store' });
      return;
    }
    void reply.send(space);
  }
}
