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
import { z } from 'zod';
import { UserPermission } from '@localess/shared';
import { RequirePermission } from '../../auth/decorators.js';
import { ZodValidationPipe } from '../../infra/http/zod-validation.pipe.js';
import { toDto } from '../../infra/http/dto.js';
import { AssetRow, AssetsService } from './assets.service.js';

const parentPath = z
  .string()
  .regex(/^([A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*)?$/, 'parentPath is a /-separated list of folder ids')
  .max(4000);
const name = z.string().trim().min(1).max(500);
const listSchema = z.object({
  parentPath: z.string().optional(),
  kind: z.enum(['FOLDER', 'FILE']).optional(),
  name: z.string().max(500).optional(),
  fileType: z.string().max(100).optional(),
  ids: z
    .string()
    .transform(it => (it ? it.split(',') : []))
    .optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
});
const folderSchema = z.object({ parentPath, name });
const updateSchema = z.object({ name: name.optional(), alt: z.string().max(2000).optional() });
const moveSchema = z.object({ parentPath });
const uploadFields = z.object({
  parentPath: parentPath.default(''),
  name: name.optional(),
  extension: z.string().max(32).optional(),
  alt: z.string().max(2000).optional(),
  source: z.string().max(2048).optional(),
});

const dto = (row: AssetRow) => toDto(row);

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

  /** `?parentPath=` (exact, '' for root), `?kind=`, `?name=` (prefix), `?fileType=image`, `?ids=a,b`, `?limit=`. */
  @Get()
  @RequirePermission(UserPermission.ASSET_READ, UserPermission.CONTENT_READ)
  async list(@Param('spaceId') spaceId: string, @Query(new ZodValidationPipe(listSchema)) query: z.infer<typeof listSchema>) {
    return (await this.assets.list(spaceId, query)).map(dto);
  }

  @Get('count')
  @RequirePermission(UserPermission.ASSET_READ, UserPermission.CONTENT_READ)
  async count(@Param('spaceId') spaceId: string, @Query('kind') kind?: 'FOLDER' | 'FILE') {
    return { count: await this.assets.count(spaceId, kind === 'FOLDER' || kind === 'FILE' ? kind : undefined) };
  }

  @Get(':id')
  @RequirePermission(UserPermission.ASSET_READ, UserPermission.CONTENT_READ)
  async get(@Param('spaceId') spaceId: string, @Param('id') id: string) {
    return dto(await this.assets.get(spaceId, id));
  }

  @Post('folders')
  @RequirePermission(UserPermission.ASSET_CREATE)
  async createFolder(@Param('spaceId') spaceId: string, @Body(new ZodValidationPipe(folderSchema)) body: z.infer<typeof folderSchema>) {
    return dto(await this.assets.createFolder(spaceId, body.parentPath, body.name));
  }

  /**
   * `multipart/form-data` with the fields (`parentPath`, optional `name`, `extension`, `alt`, `source`)
   * **before** the `file` part. Name and extension default to the uploaded filename's.
   */
  @Post('files')
  @RequirePermission(UserPermission.ASSET_CREATE)
  async upload(@Param('spaceId') spaceId: string, @Req() request: FastifyRequest) {
    if (!request.isMultipart()) throw new BadRequestException('Expected multipart/form-data');
    const file = await request.file();
    if (!file) throw new BadRequestException('Missing file part');
    const fields = uploadFields.safeParse(fieldValues(file));
    if (!fields.success) {
      file.file.resume();
      throw new BadRequestException(fields.error.issues.map(it => `${it.path.join('.')}: ${it.message}`).join('; '));
    }
    try {
      return dto(
        await this.assets.upload(spaceId, {
          ...fields.data,
          file: file.file,
          filename: file.filename,
          mimetype: file.mimetype,
          truncated: () => file.file.truncated,
        }),
      );
    } catch (error) {
      if ((error as { code?: string }).code === 'FST_REQ_FILE_TOO_LARGE') throw new PayloadTooLargeException('File is too large');
      throw error;
    }
  }

  @Patch(':id')
  @RequirePermission(UserPermission.ASSET_UPDATE)
  async update(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSchema)) body: z.infer<typeof updateSchema>,
  ) {
    return dto(await this.assets.update(spaceId, id, body));
  }

  @Put(':id/parent')
  @RequirePermission(UserPermission.ASSET_UPDATE)
  async move(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(moveSchema)) body: z.infer<typeof moveSchema>,
  ) {
    return dto(await this.assets.move(spaceId, id, body.parentPath));
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission(UserPermission.ASSET_DELETE)
  async delete(@Param('spaceId') spaceId: string, @Param('id') id: string): Promise<void> {
    await this.assets.delete(spaceId, id);
  }
}
