import { Controller, Get, Req, Res } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Public } from '../../auth/decorators.js';
import { Params, validIdParams } from '../../infra/http/v1/v1-request.js';
import { AssetDeliveryService } from './asset-delivery.service.js';

/** Asset delivery on the public API (no token): transformed images, the original file and downloads. */
@Public()
@Controller('api/v1/spaces/:spaceId')
export class AssetsPublicController {
  constructor(private readonly assetDelivery: AssetDeliveryService) {}

  @Get('assets/:assetId')
  async asset(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<void> {
    const params = request.params as Params;
    if (!validIdParams(reply, params)) return;
    await this.assetDelivery.serveTransformed(request, reply, params['spaceId'], params['assetId']);
  }

  @Get('assets/:assetId/original')
  async assetOriginal(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<void> {
    const params = request.params as Params;
    if (!validIdParams(reply, params)) return;
    await this.assetDelivery.serveStored(request, reply, params['spaceId'], params['assetId'], false);
  }

  @Get('assets/:assetId/download')
  async assetDownload(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<void> {
    const params = request.params as Params;
    if (!validIdParams(reply, params)) return;
    await this.assetDelivery.serveStored(request, reply, params['spaceId'], params['assetId'], true);
  }
}
