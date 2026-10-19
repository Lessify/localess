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
import type { MultipartFile } from '@fastify/multipart';
import type { FastifyRequest } from 'fastify';
import { UserPermission } from '@localess/shared';
import { RequirePermission } from '../../../auth/decorators.js';
import { ZodValidationPipe } from '../../../infra/http/zod-validation.pipe.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import {
  type AssetFolderCreate,
  type AssetListQuery,
  type AssetMove,
  type AssetUpdate,
  zAssetFolderCreate,
  zAssetListQuery,
  zAssetMove,
  zAssetUpdate,
  zAssetUploadFields,
} from '../models/asset.models.js';
import { AssetsService } from '../services/assets.service.js';

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
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  /** `?parentId=` ('' for root), `?kind=`, `?name=` (prefix), `?fileType=image`, `?ids=a,b`, `?limit=`. */
  @Get()
  @RequirePermission(UserPermission.ASSET_READ, UserPermission.CONTENT_READ)
  async list(@Param('spaceId') spaceId: string, @Query(new ZodValidationPipe(zAssetListQuery)) query: AssetListQuery) {
    const { parentId, ...rest } = query;
    return this.assets.list(spaceId, { ...rest, parentId: parentId === '' ? null : parentId });
  }

  /** Every folder of the space (`{ id, parentId, name }`), for the editor's breadcrumbs and move targets. */
  @Get('folders')
  @RequirePermission(UserPermission.ASSET_READ, UserPermission.CONTENT_READ)
  async folders(@Param('spaceId') spaceId: string) {
    return this.assets.folders(spaceId);
  }

  @Get('count')
  @RequirePermission(UserPermission.ASSET_READ, UserPermission.CONTENT_READ)
  async count(@Param('spaceId') spaceId: string, @Query('kind') kind?: 'FOLDER' | 'FILE') {
    return { count: await this.assets.count(spaceId, kind === 'FOLDER' || kind === 'FILE' ? kind : undefined) };
  }

  @Get(':id')
  @RequirePermission(UserPermission.ASSET_READ, UserPermission.CONTENT_READ)
  async get(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string) {
    return this.assets.get(spaceId, id);
  }

  /** How many contents use it (a folder: any file under it), for the warning before a delete. */
  @Get(':id/usage')
  @RequirePermission(UserPermission.ASSET_READ, UserPermission.CONTENT_READ)
  usage(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string) {
    return this.assets.usage(spaceId, id);
  }

  @Post('folders')
  @RequirePermission(UserPermission.ASSET_CREATE)
  async createFolder(@Param('spaceId') spaceId: string, @Body(new ZodValidationPipe(zAssetFolderCreate)) body: AssetFolderCreate) {
    return this.assets.createFolder(spaceId, body.parentId ?? null, body.name);
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
    const fields = zAssetUploadFields.safeParse(fieldValues(file));
    if (!fields.success) {
      file.file.resume();
      throw new BadRequestException(fields.error.issues.map(it => `${it.path.join('.')}: ${it.message}`).join('; '));
    }
    try {
      return await this.assets.upload(spaceId, {
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
    @Body(new ZodValidationPipe(zAssetUpdate)) body: AssetUpdate,
  ) {
    return this.assets.update(spaceId, id, body);
  }

  @Put(':id/parent')
  @RequirePermission(UserPermission.ASSET_UPDATE)
  async move(
    @Param('spaceId') spaceId: string,
    @Param('id', UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(zAssetMove)) body: AssetMove,
  ) {
    return this.assets.move(spaceId, id, body.parentId);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission(UserPermission.ASSET_DELETE)
  async delete(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string): Promise<void> {
    await this.assets.delete(spaceId, id);
  }
}
