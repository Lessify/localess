import type { MultipartFile } from '@fastify/multipart';
import {
  ANY_ROLE,
  type Asset,
  type AssetCountQuery,
  type AssetFileSummary,
  type AssetFolderCreate,
  type AssetFolderSummary,
  type AssetMove,
  type AssetPageable,
  type AssetUpdate,
  CONTENT_WRITERS,
  type Page,
} from '@localess/shared';
import { zAssetCountQuery, zAssetFolderCreate, zAssetMove, zAssetPageable, zAssetUpdate, zAssetUpload } from '@localess/shared/zod';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  PayloadTooLargeException,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { RequireRole } from '../../../auth/decorators.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import { AssetService } from '../services/asset.service.js';

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
  constructor(private readonly assetService: AssetService) {}

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

  @Patch(':assetId')
  @RequireRole(CONTENT_WRITERS)
  update(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Param('assetId', UuidParamPipe) assetId: string,
    @Body({ schema: zAssetUpdate }) body: AssetUpdate,
  ): Promise<Asset> {
    return this.assetService.update(spaceId, assetId, body);
  }

  @Put(':assetId/parent')
  @RequireRole(CONTENT_WRITERS)
  move(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Param('assetId', UuidParamPipe) assetId: string,
    @Body({ schema: zAssetMove }) body: AssetMove,
  ): Promise<Asset> {
    return this.assetService.move(spaceId, assetId, body.parentId);
  }

  @Delete(':assetId')
  @HttpCode(204)
  @RequireRole(CONTENT_WRITERS)
  remove(@Param('spaceId', UuidParamPipe) spaceId: string, @Param('assetId', UuidParamPipe) assetId: string): Promise<void> {
    return this.assetService.remove(spaceId, assetId);
  }
}
