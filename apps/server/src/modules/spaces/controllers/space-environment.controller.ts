import { Body, Controller, Delete, Param, Patch, Post, Put } from '@nestjs/common';
import { type SpaceEnvironmentInput, UserPermission } from '@localess/shared';
import { RequirePermission } from '../../../auth/decorators.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import { type EnvironmentOrder, zEnvironmentOrder, zSpaceEnvironmentInput } from '../models/space-environment.models.js';
import { SpaceEnvironmentService } from '../services/space-environment.service.js';

/** A space's environments; every route answers the space as it is after the change. */
@Controller('api/app/spaces/:spaceId/environments')
export class SpaceEnvironmentController {
  constructor(private readonly environments: SpaceEnvironmentService) {}

  @Post()
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  create(@Param('spaceId') spaceId: string, @Body({ schema: zSpaceEnvironmentInput }) body: SpaceEnvironmentInput) {
    return this.environments.create(spaceId, body);
  }

  @Put('order')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  reorder(@Param('spaceId') spaceId: string, @Body({ schema: zEnvironmentOrder }) body: EnvironmentOrder) {
    return this.environments.reorder(spaceId, body.ids);
  }

  @Patch(':environmentId')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  update(
    @Param('spaceId') spaceId: string,
    @Param('environmentId', UuidParamPipe) environmentId: string,
    @Body({ schema: zSpaceEnvironmentInput }) body: SpaceEnvironmentInput,
  ) {
    return this.environments.update(spaceId, environmentId, body);
  }

  @Delete(':environmentId')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  remove(@Param('spaceId') spaceId: string, @Param('environmentId', UuidParamPipe) environmentId: string) {
    return this.environments.remove(spaceId, environmentId);
  }
}
