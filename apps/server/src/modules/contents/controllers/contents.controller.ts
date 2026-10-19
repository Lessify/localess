import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { UserPermission } from '@localess/shared';
import { RequirePermission } from '../../../auth/decorators.js';
import { ZodValidationPipe } from '../../../infra/http/zod-validation.pipe.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import {
  type ContentCreate,
  type ContentDataUpdate,
  type ContentListQuery,
  type ContentPatch,
  zContentCreate,
  zContentDataUpdate,
  zContentListQuery,
  zContentPatch,
} from '../models/content.models.js';
import { ContentsService } from '../services/contents.service.js';

/** Contents (was direct `spaces/{s}/contents` access plus the `content-publish`/`-unpublish` callables). */
@Controller('api/app/spaces/:spaceId/contents')
export class ContentsController {
  constructor(private readonly contents: ContentsService) {}

  /** `?parentId=` ('' for root), `?kind=`, `?name=` (prefix), `?ids=a,b`, `?limit=`. */
  @Get()
  @RequirePermission(UserPermission.CONTENT_READ)
  async list(@Param('spaceId') spaceId: string, @Query(new ZodValidationPipe(zContentListQuery)) query: ContentListQuery) {
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
    @Body(new ZodValidationPipe(zContentCreate)) body: ContentCreate,
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
    @Body(new ZodValidationPipe(zContentPatch)) body: ContentPatch,
  ) {
    return this.contents.update(spaceId, id, body);
  }

  @Put(':id/data')
  @RequirePermission(UserPermission.CONTENT_UPDATE)
  async updateData(
    @Param('spaceId') spaceId: string,
    @Param('id', UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(zContentDataUpdate)) body: ContentDataUpdate,
  ) {
    return this.contents.updateData(spaceId, id, body.data);
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
