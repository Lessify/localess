import {
  ANY_ROLE,
  type Content,
  CONTENT_WRITERS,
  type ContentCountQuery,
  type ContentCreate,
  type ContentDataUpdate,
  type ContentFolderSummary,
  type ContentPageable,
  type ContentUpdate,
  type Page,
} from '@localess/shared';
import { zContentCountQuery, zContentCreate, zContentDataUpdate, zContentPageable, zContentUpdate } from '@localess/shared/zod';
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query } from '@nestjs/common';

import { RequireRole } from '../../../auth/decorators.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import { ContentService } from '../services/content.service.js';

/** Contents of a space: folders and documents, one tree. `:contentId` is the UUID. */
@Controller('api/app/spaces/:spaceId/contents')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  /**
   * One page, folders first, without the documents' data: `?page=&size=&sort=&direction=` (Pageable), `?parentId=`
   * (absent: the root), `?deep=true`, `?kind=`, `?search=` (name or slug), `?ids=a,b`.
   */
  @Get()
  @RequireRole(ANY_ROLE)
  findAll(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Query({ schema: zContentPageable }) query: ContentPageable,
  ): Promise<Page<Content>> {
    return this.contentService.findAll(spaceId, query);
  }

  /** Every folder of the space (`{ id, parentId, name, slug }`), for the editor's breadcrumbs and move targets. */
  @Get('folders')
  @RequireRole(ANY_ROLE)
  findFolders(@Param('spaceId', UuidParamPipe) spaceId: string): Promise<ContentFolderSummary[]> {
    return this.contentService.findFolders(spaceId);
  }

  @Get('count')
  @RequireRole(ANY_ROLE)
  async count(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Query({ schema: zContentCountQuery }) query: ContentCountQuery,
  ): Promise<{ count: number }> {
    return { count: await this.contentService.count(spaceId, query.kind) };
  }

  @Get(':contentId')
  @RequireRole(ANY_ROLE)
  findOne(@Param('spaceId', UuidParamPipe) spaceId: string, @Param('contentId', UuidParamPipe) contentId: string): Promise<Content> {
    return this.contentService.findOne(spaceId, contentId);
  }

  @Post()
  @RequireRole(CONTENT_WRITERS)
  create(@Param('spaceId', UuidParamPipe) spaceId: string, @Body({ schema: zContentCreate }) body: ContentCreate): Promise<Content> {
    return this.contentService.create(spaceId, body);
  }

  @Post(':contentId/clone')
  @RequireRole(CONTENT_WRITERS)
  clone(@Param('spaceId', UuidParamPipe) spaceId: string, @Param('contentId', UuidParamPipe) contentId: string): Promise<Content> {
    return this.contentService.clone(spaceId, contentId);
  }

  /** Rename and/or move (`parentId`; null is the root). */
  @Patch(':contentId')
  @RequireRole(CONTENT_WRITERS)
  update(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Param('contentId', UuidParamPipe) contentId: string,
    @Body({ schema: zContentUpdate }) body: ContentUpdate,
  ): Promise<Content> {
    return this.contentService.update(spaceId, contentId, body);
  }

  @Put(':contentId/data')
  @RequireRole(CONTENT_WRITERS)
  updateData(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Param('contentId', UuidParamPipe) contentId: string,
    @Body({ schema: zContentDataUpdate }) body: ContentDataUpdate,
  ): Promise<Content> {
    return this.contentService.updateData(spaceId, contentId, body.data);
  }

  @Delete(':contentId')
  @HttpCode(204)
  @RequireRole(CONTENT_WRITERS)
  remove(@Param('spaceId', UuidParamPipe) spaceId: string, @Param('contentId', UuidParamPipe) contentId: string): Promise<void> {
    return this.contentService.remove(spaceId, contentId);
  }

  @Post(':contentId/publish')
  @HttpCode(204)
  @RequireRole(CONTENT_WRITERS)
  publish(@Param('spaceId', UuidParamPipe) spaceId: string, @Param('contentId', UuidParamPipe) contentId: string): Promise<void> {
    return this.contentService.publish(spaceId, contentId);
  }

  @Post(':contentId/unpublish')
  @HttpCode(204)
  @RequireRole(CONTENT_WRITERS)
  unpublish(@Param('spaceId', UuidParamPipe) spaceId: string, @Param('contentId', UuidParamPipe) contentId: string): Promise<void> {
    return this.contentService.unpublish(spaceId, contentId);
  }
}
