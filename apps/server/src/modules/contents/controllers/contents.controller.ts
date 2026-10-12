import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { z } from 'zod';
import { UserPermission } from '@localess/shared';
import { zContentData } from '@localess/shared/zod';
import { RequirePermission } from '../../../auth/decorators.js';
import { ZodValidationPipe } from '../../../infra/http/zod-validation.pipe.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import { ContentsService } from '../services/contents.service.js';

/** No `/` (it separates path segments) and nothing that needs URL encoding. */
const slug = z
  .string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, 'Slugs are letters, digits, - and _')
  .max(200);
/** The folder; null or absent: the root. */
const parentId = z.uuid().nullable().optional();
const name = z.string().trim().min(1).max(500);
const ids = z.array(z.string().max(128)).max(10_000);

const createSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('DOCUMENT'), parentId, name, slug, schema: z.string().min(1).max(128) }),
  z.object({ kind: z.literal('FOLDER'), parentId, name, slug }),
]);
const updateSchema = z.object({ name: name.optional(), slug: slug.optional(), parentId });
// Blocks of known values (`zContentData`): `_id`, `_schema`, and each value one of the shapes the editor stores.
const dataSchema = z.object({ data: zContentData, assets: ids, links: ids, references: ids });
const listSchema = z.object({
  // '': the root's children; absent: any parent.
  parentId: z.union([z.uuid(), z.literal('')]).optional(),
  kind: z.enum(['FOLDER', 'DOCUMENT']).optional(),
  name: z.string().max(500).optional(),
  ids: z
    .string()
    .transform(it => (it ? it.split(',') : []))
    .optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
});

/** Contents (was direct `spaces/{s}/contents` access plus the `content-publish`/`-unpublish` callables). */
@Controller('api/app/spaces/:spaceId/contents')
export class ContentsController {
  constructor(private readonly contents: ContentsService) {}

  /** `?parentId=` ('' for root), `?kind=`, `?name=` (prefix), `?ids=a,b`, `?limit=`. */
  @Get()
  @RequirePermission(UserPermission.CONTENT_READ)
  async list(@Param('spaceId') spaceId: string, @Query(new ZodValidationPipe(listSchema)) query: z.infer<typeof listSchema>) {
    const { parentId, ...rest } = query;
    return this.contents.list(spaceId, { ...rest, parentId: parentId === '' ? null : parentId });
  }

  /** Every folder of the space (`{ id, parentId, name, slug }`), for the editor's breadcrumbs and move targets. */
  @Get('folders')
  @RequirePermission(UserPermission.CONTENT_READ)
  async folders(@Param('spaceId') spaceId: string) {
    return this.contents.folders(spaceId);
  }

  @Get('count')
  @RequirePermission(UserPermission.CONTENT_READ)
  async count(@Param('spaceId') spaceId: string, @Query('kind') kind?: 'FOLDER' | 'DOCUMENT') {
    return { count: await this.contents.count(spaceId, kind === 'FOLDER' || kind === 'DOCUMENT' ? kind : undefined) };
  }

  @Get(':id')
  @RequirePermission(UserPermission.CONTENT_READ)
  async get(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string) {
    return this.contents.get(spaceId, id);
  }

  @Post()
  @RequirePermission(UserPermission.CONTENT_CREATE)
  async create(
    @Param('spaceId') spaceId: string,
    @Body(new ZodValidationPipe(createSchema)) body: z.infer<typeof createSchema>,
  ) {
    return this.contents.create(spaceId, body);
  }

  @Post(':id/clone')
  @RequirePermission(UserPermission.CONTENT_CREATE)
  async clone(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string) {
    return this.contents.clone(spaceId, id);
  }

  /** Rename and/or move (`parentSlug`; '' is the root). */
  @Patch(':id')
  @RequirePermission(UserPermission.CONTENT_UPDATE)
  async update(
    @Param('spaceId') spaceId: string,
    @Param('id', UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(updateSchema)) body: z.infer<typeof updateSchema>,
  ) {
    return this.contents.update(spaceId, id, body);
  }

  @Put(':id/data')
  @RequirePermission(UserPermission.CONTENT_UPDATE)
  async updateData(
    @Param('spaceId') spaceId: string,
    @Param('id', UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(dataSchema)) body: z.infer<typeof dataSchema>,
  ) {
    return this.contents.updateData(spaceId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission(UserPermission.CONTENT_DELETE)
  async delete(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string): Promise<void> {
    await this.contents.delete(spaceId, id);
  }

  @Post(':id/publish')
  @HttpCode(204)
  @RequirePermission(UserPermission.CONTENT_PUBLISH)
  async publish(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string): Promise<void> {
    await this.contents.publish(spaceId, id);
  }

  @Post(':id/unpublish')
  @HttpCode(204)
  @RequirePermission(UserPermission.CONTENT_PUBLISH)
  async unpublish(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string): Promise<void> {
    await this.contents.unpublish(spaceId, id);
  }
}
