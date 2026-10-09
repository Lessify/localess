import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { z } from 'zod';
import { UserPermission } from '@localess/shared';
import { RequirePermission } from '../../auth/decorators.js';
import { CurrentUser } from '../../auth/request-context.js';
import { ZodValidationPipe } from '../../infra/http/zod-validation.pipe.js';
import type { UserRow } from '../../auth/users/users.service.js';
import { toDto } from '../../infra/http/dto.js';
import { ContentRow, ContentsService } from './contents.service.js';

/** No `/` (it separates path segments) and nothing that needs URL encoding. */
const slug = z
  .string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, 'Slugs are letters, digits, - and _')
  .max(200);
const parentSlug = z
  .string()
  .regex(/^([A-Za-z0-9][A-Za-z0-9_-]*(\/[A-Za-z0-9][A-Za-z0-9_-]*)*)?$/)
  .max(2000);
const name = z.string().trim().min(1).max(500);
const ids = z.array(z.string().max(128)).max(10_000);

const createSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('DOCUMENT'), parentSlug, name, slug, schema: z.string().min(1).max(128) }),
  z.object({ kind: z.literal('FOLDER'), parentSlug, name, slug }),
]);
const updateSchema = z.object({ name: name.optional(), slug: slug.optional(), parentSlug: parentSlug.optional() });
const dataSchema = z.object({ data: z.record(z.string(), z.unknown()), assets: ids, links: ids, references: ids });
const listSchema = z.object({
  parentSlug: z.string().optional(),
  kind: z.enum(['FOLDER', 'DOCUMENT']).optional(),
  name: z.string().max(500).optional(),
  ids: z
    .string()
    .transform(it => (it ? it.split(',') : []))
    .optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
});

const dto = (row: ContentRow) => toDto(row);

/** Contents (was direct `spaces/{s}/contents` access plus the `content-publish`/`-unpublish` callables). */
@Controller('api/app/spaces/:spaceId/contents')
export class ContentsController {
  constructor(private readonly contents: ContentsService) {}

  /** `?parentSlug=` (exact, '' for root), `?kind=`, `?name=` (prefix), `?ids=a,b`, `?limit=`. */
  @Get()
  @RequirePermission(UserPermission.CONTENT_READ)
  async list(@Param('spaceId') spaceId: string, @Query(new ZodValidationPipe(listSchema)) query: z.infer<typeof listSchema>) {
    return (await this.contents.list(spaceId, query)).map(dto);
  }

  @Get('count')
  @RequirePermission(UserPermission.CONTENT_READ)
  async count(@Param('spaceId') spaceId: string, @Query('kind') kind?: 'FOLDER' | 'DOCUMENT') {
    return { count: await this.contents.count(spaceId, kind === 'FOLDER' || kind === 'DOCUMENT' ? kind : undefined) };
  }

  @Get(':id')
  @RequirePermission(UserPermission.CONTENT_READ)
  async get(@Param('spaceId') spaceId: string, @Param('id') id: string) {
    return dto(await this.contents.get(spaceId, id));
  }

  @Post()
  @RequirePermission(UserPermission.CONTENT_CREATE)
  async create(
    @Param('spaceId') spaceId: string,
    @Body(new ZodValidationPipe(createSchema)) body: z.infer<typeof createSchema>,
    @CurrentUser() user: UserRow,
  ) {
    return dto(await this.contents.create(spaceId, body, user));
  }

  @Post(':id/clone')
  @RequirePermission(UserPermission.CONTENT_CREATE)
  async clone(@Param('spaceId') spaceId: string, @Param('id') id: string, @CurrentUser() user: UserRow) {
    return dto(await this.contents.clone(spaceId, id, user));
  }

  /** Rename and/or move (`parentSlug`; '' is the root). */
  @Patch(':id')
  @RequirePermission(UserPermission.CONTENT_UPDATE)
  async update(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSchema)) body: z.infer<typeof updateSchema>,
    @CurrentUser() user: UserRow,
  ) {
    return dto(await this.contents.update(spaceId, id, body, user));
  }

  @Put(':id/data')
  @RequirePermission(UserPermission.CONTENT_UPDATE)
  async updateData(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(dataSchema)) body: z.infer<typeof dataSchema>,
    @CurrentUser() user: UserRow,
  ) {
    return dto(await this.contents.updateData(spaceId, id, body, user));
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission(UserPermission.CONTENT_DELETE)
  async delete(@Param('spaceId') spaceId: string, @Param('id') id: string): Promise<void> {
    await this.contents.delete(spaceId, id);
  }

  @Post(':id/publish')
  @HttpCode(204)
  @RequirePermission(UserPermission.CONTENT_PUBLISH)
  async publish(@Param('spaceId') spaceId: string, @Param('id') id: string): Promise<void> {
    await this.contents.publish(spaceId, id);
  }

  @Post(':id/unpublish')
  @HttpCode(204)
  @RequirePermission(UserPermission.CONTENT_PUBLISH)
  async unpublish(@Param('spaceId') spaceId: string, @Param('id') id: string): Promise<void> {
    await this.contents.unpublish(spaceId, id);
  }
}
