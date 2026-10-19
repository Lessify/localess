import { Body, Controller, Delete, Param, Patch, Post, Put } from '@nestjs/common';
import { zSpaceEnvironmentCreate, zSpaceEnvironmentOrder, zSpaceEnvironmentUpdate } from '@localess/shared/zod';
import { type SpaceEnvironmentCreate, type SpaceEnvironmentOrder, type SpaceEnvironmentUpdate, UserPermission } from '@localess/shared';
import { RequirePermission } from '../../../auth/decorators.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import { SpaceEnvironmentService } from '../services/space-environment.service.js';

/** A space's environments; every route answers the space as it is after the change. */
@Controller('api/app/spaces/:spaceId/environments')
export class SpaceEnvironmentController {
  constructor(private readonly spaceEnvironmentService: SpaceEnvironmentService) {}

  @Post()
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  create(@Param('spaceId') spaceId: string, @Body({ schema: zSpaceEnvironmentCreate }) body: SpaceEnvironmentCreate) {
    return this.spaceEnvironmentService.create(spaceId, body);
  }

  @Put('order')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  reorder(@Param('spaceId') spaceId: string, @Body({ schema: zSpaceEnvironmentOrder }) body: SpaceEnvironmentOrder) {
    return this.spaceEnvironmentService.reorder(spaceId, body.ids);
  }

  @Patch(':environmentId')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  update(
    @Param('spaceId') spaceId: string,
    @Param('environmentId', UuidParamPipe) environmentId: string,
    @Body({ schema: zSpaceEnvironmentUpdate }) body: SpaceEnvironmentUpdate,
  ) {
    return this.spaceEnvironmentService.update(spaceId, environmentId, body);
  }

  @Delete(':environmentId')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  remove(@Param('spaceId') spaceId: string, @Param('environmentId', UuidParamPipe) environmentId: string) {
    return this.spaceEnvironmentService.remove(spaceId, environmentId);
  }
}
