import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { zSpaceEnvironmentCreate, zSpaceEnvironmentMove, zSpaceEnvironmentPageable, zSpaceEnvironmentUpdate } from '@localess/shared/zod';
import {
  type IdNameUrl,
  type Page,
  type SpaceEnvironment,
  type SpaceEnvironmentCreate,
  type SpaceEnvironmentMove,
  type SpaceEnvironmentPageable,
  type SpaceEnvironmentUpdate,
  UserPermission,
} from '@localess/shared';
import { RequireAnyRole, RequirePermission } from '../../../auth/decorators.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import { SpaceEnvironmentService } from '../services/space-environment.service.js';

/** A space's environments (the first is the default). Reads: same audience as the space, the Visual Editor previews with them. */
@Controller('api/app/spaces/:spaceId/environments')
export class SpaceEnvironmentController {
  constructor(private readonly spaceEnvironmentService: SpaceEnvironmentService) {}

  /** One page for Space Settings → Visual Editor: `?page=&size=&sort=&direction=` (Pageable), `?search=` (name or URL). */
  @Get()
  @RequireAnyRole()
  findAll(@Param('spaceId', UuidParamPipe) spaceId: string, @Query({ schema: zSpaceEnvironmentPageable }) query: SpaceEnvironmentPageable): Promise<Page<SpaceEnvironment>> {
    return this.spaceEnvironmentService.findAll(spaceId, query);
  }

  /** Every environment of the space, in its order, as `{ id, name, url }`: the Visual Editor's list (before `:environmentId`). */
  @Get('names')
  @RequireAnyRole()
  findAllNames(@Param('spaceId', UuidParamPipe) spaceId: string): Promise<IdNameUrl[]> {
    return this.spaceEnvironmentService.findAllNames(spaceId);
  }

  @Post()
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  create(@Param('spaceId', UuidParamPipe) spaceId: string, @Body({ schema: zSpaceEnvironmentCreate }) body: SpaceEnvironmentCreate): Promise<SpaceEnvironment> {
    return this.spaceEnvironmentService.create(spaceId, body);
  }

  @Post(':environmentId/move')
  @HttpCode(204)
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  async move(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Param('environmentId', UuidParamPipe) environmentId: string,
    @Body({ schema: zSpaceEnvironmentMove }) body: SpaceEnvironmentMove,
  ): Promise<void> {
    await this.spaceEnvironmentService.move(spaceId, environmentId, body);
  }

  @Put(':environmentId')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  update(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Param('environmentId', UuidParamPipe) environmentId: string,
    @Body({ schema: zSpaceEnvironmentUpdate }) body: SpaceEnvironmentUpdate,
  ): Promise<SpaceEnvironment> {
    return this.spaceEnvironmentService.update(spaceId, environmentId, body);
  }

  @Delete(':environmentId')
  @HttpCode(204)
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  async remove(@Param('spaceId', UuidParamPipe) spaceId: string, @Param('environmentId', UuidParamPipe) environmentId: string): Promise<void> {
    await this.spaceEnvironmentService.remove(spaceId, environmentId);
  }
}
