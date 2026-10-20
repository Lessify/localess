import {
  ANY_ROLE,
  CONTENT_WRITERS,
  type ContentCreate,
  type ContentDataUpdate,
  type ContentListQuery,
  type ContentUpdate,
} from '@localess/shared';
import { zContentCreate, zContentDataUpdate, zContentListQuery, zContentUpdate } from '@localess/shared/zod';
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query } from '@nestjs/common';

import { RequireRole } from '../../../auth/decorators.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import { ContentService } from '../services/content.service.js';

/** Contents (was direct `spaces/{s}/contents` access plus the `content-publish`/`-unpublish` callables). */
@Controller('api/app/spaces/:spaceId/contents')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  /** `?parentId=` ('' for root), `?kind=`, `?name=` (prefix), `?ids=a,b`, `?limit=`. */
  @Get()
  @RequireRole(ANY_ROLE)
  async findAll(@Param('spaceId') spaceId: string, @Query({ schema: zContentListQuery }) query: ContentListQuery) {
    const { parentId, ...rest } = query;
    return this.contentService.findAll(spaceId, { ...rest, parentId: parentId === '' ? null : parentId });
  }

  /** Every folder of the space (`{ id, parentId, name, slug }`), for the editor's breadcrumbs and move targets. */
  @Get('folders')
  @RequireRole(ANY_ROLE)
  async findFolders(@Param('spaceId') spaceId: string) {
    return this.contentService.findFolders(spaceId);
  }

  @Get('count')
  @RequireRole(ANY_ROLE)
  async count(@Param('spaceId') spaceId: string, @Query('kind') kind?: 'FOLDER' | 'DOCUMENT') {
    return { count: await this.contentService.count(spaceId, kind === 'FOLDER' || kind === 'DOCUMENT' ? kind : undefined) };
  }

  @Get(':id')
  @RequireRole(ANY_ROLE)
  async findOne(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string) {
    return this.contentService.findOne(spaceId, id);
  }

  @Post()
  @RequireRole(CONTENT_WRITERS)
  async create(@Param('spaceId') spaceId: string, @Body({ schema: zContentCreate }) body: ContentCreate) {
    return this.contentService.create(spaceId, body);
  }

  @Post(':id/clone')
  @RequireRole(CONTENT_WRITERS)
  async clone(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string) {
    return this.contentService.clone(spaceId, id);
  }

  /** Rename and/or move (`parentSlug`; '' is the root). */
  @Patch(':id')
  @RequireRole(CONTENT_WRITERS)
  async update(
    @Param('spaceId') spaceId: string,
    @Param('id', UuidParamPipe) id: string,
    @Body({ schema: zContentUpdate }) body: ContentUpdate,
  ) {
    return this.contentService.update(spaceId, id, body);
  }

  @Put(':id/data')
  @RequireRole(CONTENT_WRITERS)
  async updateData(
    @Param('spaceId') spaceId: string,
    @Param('id', UuidParamPipe) id: string,
    @Body({ schema: zContentDataUpdate }) body: ContentDataUpdate,
  ) {
    return this.contentService.updateData(spaceId, id, body.data);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequireRole(CONTENT_WRITERS)
  async remove(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string): Promise<void> {
    await this.contentService.remove(spaceId, id);
  }

  @Post(':id/publish')
  @HttpCode(204)
  @RequireRole(CONTENT_WRITERS)
  async publish(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string): Promise<void> {
    await this.contentService.publish(spaceId, id);
  }

  @Post(':id/unpublish')
  @HttpCode(204)
  @RequireRole(CONTENT_WRITERS)
  async unpublish(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string): Promise<void> {
    await this.contentService.unpublish(spaceId, id);
  }
}
