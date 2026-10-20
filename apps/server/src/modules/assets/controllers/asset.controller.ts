import {
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
  BadRequestException,
} from '@nestjs/common';
import { zAssetFolderCreate, zAssetListQuery, zAssetMove, zAssetUpdate, zAssetUpload } from '@localess/shared/zod';
import type { MultipartFile } from '@fastify/multipart';
import type { FastifyRequest } from 'fastify';
import { type AssetFolderCreate, type AssetListQuery, type AssetMove, type AssetUpdate, UserPermission } from '@localess/shared';
import { RequirePermission } from '../../../auth/decorators.js';
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

/** Asset library (was direct Firestore access plus browser uploads to Cloud Storage). */
@Controller('api/app/spaces/:spaceId/assets')
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  /** `?parentId=` ('' for root), `?kind=`, `?name=` (prefix), `?fileType=image`, `?ids=a,b`, `?limit=`. */
  @Get()
  @RequirePermission(UserPermission.ASSET_READ, UserPermission.CONTENT_READ)
  async findAll(@Param('spaceId') spaceId: string, @Query({ schema: zAssetListQuery }) query: AssetListQuery) {
    const { parentId, ...rest } = query;
    return this.assetService.findAll(spaceId, { ...rest, parentId: parentId === '' ? null : parentId });
  }

  /** Every folder of the space (`{ id, parentId, name }`), for the editor's breadcrumbs and move targets. */
  @Get('folders')
  @RequirePermission(UserPermission.ASSET_READ, UserPermission.CONTENT_READ)
  async findFolders(@Param('spaceId') spaceId: string) {
    return this.assetService.findFolders(spaceId);
  }

  @Get('count')
  @RequirePermission(UserPermission.ASSET_READ, UserPermission.CONTENT_READ)
  async count(@Param('spaceId') spaceId: string, @Query('kind') kind?: 'FOLDER' | 'FILE') {
    return { count: await this.assetService.count(spaceId, kind === 'FOLDER' || kind === 'FILE' ? kind : undefined) };
  }

  @Get(':id')
  @RequirePermission(UserPermission.ASSET_READ, UserPermission.CONTENT_READ)
  async findOne(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string) {
    return this.assetService.findOne(spaceId, id);
  }

  /** How many contents use it (a folder: any file under it), for the warning before a delete. */
  @Get(':id/usage')
  @RequirePermission(UserPermission.ASSET_READ, UserPermission.CONTENT_READ)
  findUsage(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string) {
    return this.assetService.findUsage(spaceId, id);
  }

  @Post('folders')
  @RequirePermission(UserPermission.ASSET_CREATE)
  async createFolder(@Param('spaceId') spaceId: string, @Body({ schema: zAssetFolderCreate }) body: AssetFolderCreate) {
    return this.assetService.createFolder(spaceId, body.parentId ?? null, body.name);
  }

  /**
   * `multipart/form-data` with the fields (`parentId`, optional `name`, `extension`, `alt`, `source`)
   * **before** the `file` part. Name and extension default to the uploaded filename's.
   */
  @Post('files')
  @RequirePermission(UserPermission.ASSET_CREATE)
  async upload(@Param('spaceId') spaceId: string, @Req() request: FastifyRequest) {
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

  @Patch(':id')
  @RequirePermission(UserPermission.ASSET_UPDATE)
  async update(
    @Param('spaceId') spaceId: string,
    @Param('id', UuidParamPipe) id: string,
    @Body({ schema: zAssetUpdate }) body: AssetUpdate,
  ) {
    return this.assetService.update(spaceId, id, body);
  }

  @Put(':id/parent')
  @RequirePermission(UserPermission.ASSET_UPDATE)
  async move(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string, @Body({ schema: zAssetMove }) body: AssetMove) {
    return this.assetService.move(spaceId, id, body.parentId);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission(UserPermission.ASSET_DELETE)
  async remove(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string): Promise<void> {
    await this.assetService.remove(spaceId, id);
  }
}
