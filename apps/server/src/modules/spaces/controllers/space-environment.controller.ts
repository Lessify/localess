import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { zSpaceEnvironmentCreate, zSpaceEnvironmentOrder, zSpaceEnvironmentUpdate } from '@localess/shared/zod';
import { type SpaceEnvironment, type SpaceEnvironmentCreate, type SpaceEnvironmentOrder, type SpaceEnvironmentUpdate, UserPermission } from '@localess/shared';
import { RequireAnyRole, RequirePermission } from '../../../auth/decorators.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import { SpaceEnvironmentService } from '../services/space-environment.service.js';

/** A space's environments; every route answers them in position order, a change after it is made. */
@Controller('api/app/spaces/:spaceId/environments')
export class SpaceEnvironmentController {
  constructor(private readonly spaceEnvironmentService: SpaceEnvironmentService) {}

  /** Same audience as reading the space: the Visual Editor previews with them. */
  @Get()
  @RequireAnyRole()
  findAll(@Param('spaceId') spaceId: string): Promise<SpaceEnvironment[]> {
    return this.spaceEnvironmentService.findAll(spaceId);
  }

  @Post()
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  create(@Param('spaceId') spaceId: string, @Body({ schema: zSpaceEnvironmentCreate }) body: SpaceEnvironmentCreate): Promise<SpaceEnvironment[]> {
    return this.spaceEnvironmentService.create(spaceId, body);
  }

  @Put('order')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  reorder(@Param('spaceId') spaceId: string, @Body({ schema: zSpaceEnvironmentOrder }) body: SpaceEnvironmentOrder): Promise<SpaceEnvironment[]> {
    return this.spaceEnvironmentService.reorder(spaceId, body.ids);
  }

  @Patch(':environmentId')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  update(
    @Param('spaceId') spaceId: string,
    @Param('environmentId', UuidParamPipe) environmentId: string,
    @Body({ schema: zSpaceEnvironmentUpdate }) body: SpaceEnvironmentUpdate,
  ): Promise<SpaceEnvironment[]> {
    return this.spaceEnvironmentService.update(spaceId, environmentId, body);
  }

  @Delete(':environmentId')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  remove(@Param('spaceId') spaceId: string, @Param('environmentId', UuidParamPipe) environmentId: string): Promise<SpaceEnvironment[]> {
    return this.spaceEnvironmentService.remove(spaceId, environmentId);
  }
}
