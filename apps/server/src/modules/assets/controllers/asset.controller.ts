import type { MultipartFile } from '@fastify/multipart';
import {
  ANY_ROLE,
  type Asset,
  type AssetCountQuery,
  type AssetFileSummary,
  type AssetFolderCreate,
  type AssetFolderSummary,
  type AssetPageable,
  type AssetUpdate,
  CONTENT_WRITERS,
  type Page,
} from '@localess/shared';
import { zAssetCountQuery, zAssetFolderCreate, zAssetPageable, zAssetUpdate, zAssetUpload } from '@localess/shared/zod';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  PayloadTooLargeException,
  Post,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { RequireRole } from '../../../auth/decorators.js';
import { buildContentDisposition } from '../../../infra/http/content-disposition.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import { AssetService } from '../services/asset.service.js';
import { AssetDeliveryService, type StoredAsset } from '../services/asset-delivery.service.js';
import { buildAssetETag } from '../utils/asset-etag.js';
import { assetResponsePolicy } from '../utils/asset-headers.js';
import { sendStoredObject } from '../utils/send-stored-object.js';

/** A response made from an asset's bytes, which never change: the browser keeps it for a year. */
const PRIVATE_IMMUTABLE = 'private, max-age=31536000, immutable';

/** Values of the non-file parts that preceded the file in the multipart body. */
function fieldValues(file: MultipartFile): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, field] of Object.entries(file.fields)) {
    const part = Array.isArray(field) ? field[0] : field;
    if (part && part.type === 'field') values[key] = String(part.value);
  }
  return values;
}

/** Asset library (was direct Firestore access plus browser uploads to Cloud Storage). `:assetId` is the UUID. */
@Controller('api/app/spaces/:spaceId/assets')
export class AssetController {
  constructor(
    private readonly assetService: AssetService,
    private readonly assetDeliveryService: AssetDeliveryService,
  ) {}

  /**
   * One page, folders first: `?page=&size=&sort=&direction=` (Pageable), `?parentId=` (absent: the root), `?deep=true`,
   * `?kind=`, `?fileType=` (folders stay listed), `?search=` (the name).
   */
  @Get()
  @RequireRole(ANY_ROLE)
  findAll(@Param('spaceId', UuidParamPipe) spaceId: string, @Query({ schema: zAssetPageable }) query: AssetPageable): Promise<Page<Asset>> {
    return this.assetService.findAll(spaceId, query);
  }

  /** Every folder of the space (`{ id, parentId, name }`), for the editor's breadcrumbs and move targets. */
  @Get('folders')
  @RequireRole(ANY_ROLE)
  findFolders(@Param('spaceId', UuidParamPipe) spaceId: string): Promise<AssetFolderSummary[]> {
    return this.assetService.findFolders(spaceId);
  }

  /** Every file of the space, light (`AssetFileSummary`), for the editor's Asset and Assets fields. */
  @Get('files')
  @RequireRole(ANY_ROLE)
  findFiles(@Param('spaceId', UuidParamPipe) spaceId: string): Promise<AssetFileSummary[]> {
    return this.assetService.findFiles(spaceId);
  }

  @Get('count')
  @RequireRole(ANY_ROLE)
  async count(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Query({ schema: zAssetCountQuery }) query: AssetCountQuery,
  ): Promise<{ count: number }> {
    return { count: await this.assetService.count(spaceId, query.kind) };
  }

  @Get(':assetId')
  @RequireRole(ANY_ROLE)
  findOne(@Param('spaceId', UuidParamPipe) spaceId: string, @Param('assetId', UuidParamPipe) assetId: string): Promise<Asset> {
    return this.assetService.findOne(spaceId, assetId);
  }

  /**
   * The platform's thumbnail of a file (every list, grid and field shows it): WebP, the longest side at most 512 px,
   * generated once. An asset's bytes never change, so the browser keeps it for a year. `404` when the asset has none
   * (a folder, a file that is not an image or a video): the platform shows its icon.
   */
  @Get(':assetId/thumbnail')
  @RequireRole(ANY_ROLE)
  async findThumbnail(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Param('assetId', UuidParamPipe) assetId: string,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const thumbnail = await this.assetDeliveryService.findThumbnail(spaceId, assetId);
    if (!thumbnail) throw new NotFoundException('No thumbnail');
    this.sendPlatformImage(request, reply, thumbnail.output, thumbnail.md5, 'thumbnail');
  }

  /**
   * The preview dialog's picture of an image: WebP, the longest side at most 2048 px, never enlarged, generated the
   * first time it is asked for; an SVG or an animation as stored (vector, or it plays). `404` for anything else: the
   * dialog shows the thumbnail.
   */
  @Get(':assetId/preview')
  @RequireRole(ANY_ROLE)
  async findPreview(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Param('assetId', UuidParamPipe) assetId: string,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const preview = await this.assetDeliveryService.findPreview(spaceId, assetId);
    if (!preview) throw new NotFoundException('No preview');
    if (preview.kind === 'generated') {
      this.sendPlatformImage(request, reply, preview.output, preview.md5, 'preview');
    } else {
      this.sendStored(request, reply, preview.stored, false);
    }
  }

  /** The stored file as uploaded, inline where that is safe, with Range requests: the preview dialog plays videos from it. */
  @Get(':assetId/original')
  @RequireRole(ANY_ROLE)
  async findOriginal(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Param('assetId', UuidParamPipe) assetId: string,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const stored = await this.assetDeliveryService.findStored(spaceId, assetId);
    if (stored.kind === 'missing') throw new NotFoundException('Asset not found');
    this.sendStored(request, reply, stored, false);
  }

  /** The stored file as an attachment named `name` + `extension`: Download in the platform. */
  @Get(':assetId/download')
  @RequireRole(ANY_ROLE)
  async findDownload(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Param('assetId', UuidParamPipe) assetId: string,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const stored = await this.assetDeliveryService.findStored(spaceId, assetId);
    if (stored.kind === 'missing') throw new NotFoundException('Asset not found');
    this.sendStored(request, reply, stored, true);
  }

  /** How many contents use it (a folder: any file under it), for the warning before a delete. */
  @Get(':assetId/usage')
  @RequireRole(ANY_ROLE)
  findUsage(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Param('assetId', UuidParamPipe) assetId: string,
  ): Promise<{ contents: number }> {
    return this.assetService.findUsage(spaceId, assetId);
  }

  @Post('folders')
  @RequireRole(CONTENT_WRITERS)
  createFolder(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Body({ schema: zAssetFolderCreate }) body: AssetFolderCreate,
  ): Promise<Asset> {
    return this.assetService.createFolder(spaceId, body.parentId ?? null, body.name);
  }

  /**
   * `multipart/form-data` with the fields (`parentId`, optional `name`, `extension`, `alt`, `source`)
   * **before** the `file` part. Name and extension default to the uploaded filename's.
   */
  @Post('files')
  @RequireRole(CONTENT_WRITERS)
  async upload(@Param('spaceId', UuidParamPipe) spaceId: string, @Req() request: FastifyRequest): Promise<Asset> {
    if (!request.isMultipart()) throw new BadRequestException('Expected multipart/form-data');
    const file = await request.file();
    if (!file) throw new BadRequestException('Missing file part');
    const fields = zAssetUpload.safeParse(fieldValues(file));
    if (!fields.success) {
      file.file.resume();
      throw new BadRequestException(fields.error.issues.map(it => `${it.path.join('.')}: ${it.message}`).join('; '));
    }
    try {
      return await this.assetService.upload(spaceId, {
        ...fields.data,
        parentId: fields.data.parentId || null,
        file: file.file,
        filename: file.filename,
        mimetype: file.mimetype,
        truncated: () => file.file.truncated,
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'FST_REQ_FILE_TOO_LARGE') throw new PayloadTooLargeException('File is too large');
      throw error;
    }
  }

  /**
   * The file of a file asset that has none (`missingFile`, imported from Firebase without it), `multipart/form-data`
   * with one `file` part. The asset keeps its id, name, folder and alt; 409 when it already has its file.
   */
  @Put(':assetId/file')
  @RequireRole(CONTENT_WRITERS)
  async uploadMissingFile(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Param('assetId', UuidParamPipe) assetId: string,
    @Req() request: FastifyRequest,
  ): Promise<Asset> {
    if (!request.isMultipart()) throw new BadRequestException('Expected multipart/form-data');
    const file = await request.file();
    if (!file) throw new BadRequestException('Missing file part');
    try {
      return await this.assetService.uploadMissingFile(spaceId, assetId, {
        file: file.file,
        filename: file.filename,
        mimetype: file.mimetype,
        truncated: () => file.file.truncated,
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'FST_REQ_FILE_TOO_LARGE') throw new PayloadTooLargeException('File is too large');
      throw error;
    }
  }

  /** Rename (name; alt for a file) and/or move (`parentId`; null is the root, with everything under a folder). */
  @Patch(':assetId')
  @RequireRole(CONTENT_WRITERS)
  update(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Param('assetId', UuidParamPipe) assetId: string,
    @Body({ schema: zAssetUpdate }) body: AssetUpdate,
  ): Promise<Asset> {
    return this.assetService.update(spaceId, assetId, body);
  }

  @Delete(':assetId')
  @HttpCode(204)
  @RequireRole(CONTENT_WRITERS)
  remove(@Param('spaceId', UuidParamPipe) spaceId: string, @Param('assetId', UuidParamPipe) assetId: string): Promise<void> {
    return this.assetService.remove(spaceId, assetId);
  }

  /**
   * A generated platform image (WebP). An asset's bytes never change, so neither does what is made from them: the
   * browser keeps it for a year, and revalidates by the original's md5.
   */
  private sendPlatformImage(request: FastifyRequest, reply: FastifyReply, output: Buffer, md5: string | null, kind: string): void {
    void reply.header('cache-control', PRIVATE_IMMUTABLE);
    if (md5 && this.notModified(request, reply, buildAssetETag(md5, kind, false))) return;
    void reply.type('image/webp').send(output);
  }

  /**
   * The stored bytes, typed and disposed as on the CDN API (only what can't script is inline). An attachment is
   * revalidated on every use: it carries the asset's name, which can change.
   */
  private sendStored(request: FastifyRequest, reply: FastifyReply, stored: StoredAsset, attachment: boolean): void {
    const policy = assetResponsePolicy(stored.type, attachment);
    void reply.header('cache-control', attachment ? 'private, no-cache' : PRIVATE_IMMUTABLE);
    if (stored.md5 && this.notModified(request, reply, buildAssetETag(stored.md5, '', false))) return;
    void reply
      .header('content-disposition', buildContentDisposition(stored.filename, policy.attachment))
      .headers(policy.headers)
      .type(policy.contentType);
    sendStoredObject(request, reply, stored.size, range => this.assetDeliveryService.createReadStream(stored.key, range));
  }

  /** Sets the `etag`, and answers `304` when the request already has it. */
  private notModified(request: FastifyRequest, reply: FastifyReply, etag: string): boolean {
    void reply.header('etag', etag);
    if (request.headers['if-none-match'] !== etag) return false;
    void reply.code(304).send();
    return true;
  }
}
