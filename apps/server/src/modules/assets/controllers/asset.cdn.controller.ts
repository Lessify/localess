import { Controller, Get, Req, Res } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { Public } from '../../../auth/decorators.js';
import { buildContentDisposition } from '../../../infra/http/content-disposition.js';
import {
  CACHE_ASSET_MAX_AGE,
  CACHE_ASSET_NOT_FOUND_MAX_AGE,
  CACHE_BAD_REQUEST_MAX_AGE,
  publicCache,
} from '../../../infra/http/v1/cache-control.js';
import { Params, validIdParams } from '../../../infra/http/v1/v1-request.js';
import { sendV1Error } from '../../../infra/http/v1/v1-response.js';
import { AssetDeliveryService } from '../services/asset-delivery.service.js';
import { buildAssetETag } from '../utils/asset-etag.js';
import { assetResponsePolicy } from '../utils/asset-headers.js';
import { buildAssetQuery, findTransformParam } from '../utils/asset-query.js';
import { parseByteRange } from '../utils/byte-range.js';
import { parseAssetTransformQuery } from '../utils/image-transform.js';

/**
 * Asset delivery on the CDN API (no token): transformed images, the original file and downloads. A Firestore asset
 * id (imported from Firebase) redirects to the UUID URL.
 */
@Public()
@Controller('api/v1/spaces/:spaceId')
export class AssetCdnController {
  constructor(private readonly assetDeliveryService: AssetDeliveryService) {}

  @Get('assets/:assetId')
  async asset(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<void> {
    const params = request.params as Params;
    if (!validIdParams(reply, params)) return;
    if (await this.redirectLegacyId(request, reply, params['spaceId'], params['assetId'])) return;
    await this.serveTransformed(request, reply, params['spaceId'], params['assetId']);
  }

  @Get('assets/:assetId/original')
  async assetOriginal(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<void> {
    const params = request.params as Params;
    if (!validIdParams(reply, params)) return;
    if (await this.redirectLegacyId(request, reply, params['spaceId'], params['assetId'])) return;
    await this.serveStored(request, reply, params['spaceId'], params['assetId'], false);
  }

  @Get('assets/:assetId/download')
  async assetDownload(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<void> {
    const params = request.params as Params;
    if (!validIdParams(reply, params)) return;
    if (await this.redirectLegacyId(request, reply, params['spaceId'], params['assetId'])) return;
    await this.serveStored(request, reply, params['spaceId'], params['assetId'], true);
  }

  /**
   * An asset URL with a Firestore id (an asset imported from Firebase, linked from customer sites, CDNs and emails):
   * `301` to the same URL with the asset's UUID, so caches converge on one URL. Returns false when `assetId` is a
   * UUID or no asset has it as `legacy_id`, and the route carries on as usual.
   */
  private async redirectLegacyId(request: FastifyRequest, reply: FastifyReply, spaceId: string, assetId: string): Promise<boolean> {
    const id = await this.assetDeliveryService.findLegacyAssetId(spaceId, assetId);
    if (!id) return false;
    const location = request.url.replace(`/assets/${encodeURIComponent(assetId)}`, `/assets/${id}`);
    void reply.header('cache-control', publicCache(CACHE_ASSET_MAX_AGE)).redirect(location, 301);
    return true;
  }

  /** `GET /assets/:id/original` and `/download`: the stored bytes, untouched. */
  private async serveStored(
    request: FastifyRequest,
    reply: FastifyReply,
    spaceId: string,
    assetId: string,
    attachment: boolean,
  ): Promise<void> {
    // No transform here, so a transform parameter is a caller error rather than something to ignore.
    const offending = findTransformParam(request.query as Record<string, unknown>);
    if (offending !== undefined) {
      this.sendBadRequest(
        reply,
        `Unsupported '${offending}' parameter on this route. It serves the stored bytes and applies no transform. ` +
          'Use GET /api/v1/spaces/{spaceId}/assets/{assetId} for transforms.',
      );
      return;
    }
    const stored = await this.assetDeliveryService.findStored(spaceId, assetId);
    if (stored.kind === 'missing') {
      this.sendMissing(reply, stored.rowExists);
      return;
    }
    // `orig` is reserved for the stored bytes, keeping this tag distinct from every rendition's.
    if (stored.md5 && this.notModified(request, reply, buildAssetETag(stored.md5, '', false))) return;
    const policy = assetResponsePolicy(stored.type, attachment);
    void reply
      .header('cache-control', publicCache(CACHE_ASSET_MAX_AGE))
      .header('content-disposition', buildContentDisposition(stored.filename, policy.attachment))
      .headers(policy.headers)
      .type(policy.contentType);
    this.sendObject(request, reply, stored.key, stored.size);
  }

  /** `GET /assets/:id`: transforms (`w`, `h`, `f`, `q`, `fit`, `thumbnail`) and quality normalisation. */
  private async serveTransformed(request: FastifyRequest, reply: FastifyReply, spaceId: string, assetId: string): Promise<void> {
    const parsed = parseAssetTransformQuery(request.query as Record<string, unknown>);
    if (!parsed.ok) {
      // Cached: the rejection is a pure function of the query.
      this.sendBadRequest(reply, parsed.error.message);
      return;
    }
    const planned = await this.assetDeliveryService.planTransform(spaceId, assetId, parsed.query);
    if (planned.kind === 'missing') {
      this.sendMissing(reply, planned.rowExists);
      return;
    }
    if (planned.kind === 'canonical') {
      // Oversized requests redirect to the size the source can produce: one URL, one response.
      const target = `/api/v1/spaces/${spaceId}/assets/${assetId}${buildAssetQuery(planned.query)}`;
      void reply.header('cache-control', publicCache(CACHE_ASSET_MAX_AGE)).redirect(target, 302);
      return;
    }
    const { plan } = planned;
    // Answered before any read or transform: revalidation costs a row lookup, not a re-encode.
    if (plan.md5 && this.notModified(request, reply, buildAssetETag(plan.md5, plan.etagSuffix, plan.thumbnail))) return;

    const rendition = await this.assetDeliveryService.render(plan);
    if (rendition.kind === 'bad-request') {
      this.sendBadRequest(reply, rendition.message);
      return;
    }
    const policy = assetResponsePolicy(rendition.contentType, false);
    void reply
      .header('cache-control', publicCache(CACHE_ASSET_MAX_AGE))
      .header('content-disposition', buildContentDisposition(rendition.filename, policy.attachment))
      .headers(policy.headers)
      .type(policy.contentType);
    if (rendition.output) {
      void reply.send(rendition.output);
    } else {
      this.sendObject(request, reply, plan.key, plan.size);
    }
  }

  /** Sets the `etag`, and answers `304` when the request already has it. */
  private notModified(request: FastifyRequest, reply: FastifyReply, etag: string): boolean {
    void reply.header('etag', etag);
    if (request.headers['if-none-match'] !== etag) return false;
    void reply.code(304).header('cache-control', publicCache(CACHE_ASSET_MAX_AGE)).send();
    return true;
  }

  /**
   * Two different failures, cached differently: no row means the asset doesn't exist (cache hard);
   * a row without its file is an upload in flight (never cache — it's about to appear).
   */
  private sendMissing(reply: FastifyReply, rowExists: boolean): void {
    if (rowExists) {
      sendV1Error(reply, 404, 'not-found', 'Not found, upload may still be in progress.', { cacheControl: 'no-cache' });
    } else {
      sendV1Error(reply, 404, 'not-found', 'Not found.', { cacheControl: publicCache(CACHE_ASSET_NOT_FOUND_MAX_AGE) });
    }
  }

  private sendBadRequest(reply: FastifyReply, message: string): void {
    sendV1Error(reply, 400, 'invalid-argument', message, { cacheControl: publicCache(CACHE_BAD_REQUEST_MAX_AGE) });
  }

  /** Streams a stored object, honouring a single `Range` (videos are where clients resume). */
  private sendObject(request: FastifyRequest, reply: FastifyReply, key: string, size: number): void {
    void reply.header('accept-ranges', 'bytes');
    const range = parseByteRange(request.headers.range, size);
    if (range === 'unsatisfiable') {
      void reply.code(416).header('content-range', `bytes */${size}`).send();
      return;
    }
    if (range) {
      void reply
        .code(206)
        .header('content-range', `bytes ${range.start}-${range.end}/${size}`)
        .header('content-length', range.end - range.start + 1)
        .send(this.assetDeliveryService.createReadStream(key, range));
      return;
    }
    void reply.header('content-length', size).send(this.assetDeliveryService.createReadStream(key));
  }
}
