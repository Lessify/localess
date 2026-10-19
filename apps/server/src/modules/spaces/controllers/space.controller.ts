import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { zSpaceCreate, zSpacePageable, zSpaceUpdate } from '@localess/shared/zod';
import { type SpaceCreate, type SpacePageable, type SpaceUpdate, UserPermission } from '@localess/shared';
import { RequireAnyRole, RequirePermission } from '../../../auth/decorators.js';
import { SpaceService } from '../services/space.service.js';

/** Spaces and the dashboard overview (their locales and environments: `SpaceLocaleController`, `SpaceEnvironmentController`) (was direct `spaces/{id}` writes plus the `space-calculateoverview` callable). */
@Controller('api/app/spaces')
export class SpaceController {
  constructor(private readonly spaces: SpaceService) {}

  /** One page: `?page=&size=&sort=&direction=` (Pageable), `?search=` (name, or the id), `?importing=false`. */
  @Get()
  @RequireAnyRole()
  findAll(@Query({ schema: zSpacePageable }) query: SpacePageable) {
    return this.spaces.findAll(query);
  }

  /** The templates a space may be created from (before `:spaceId`, which would take `templates` as an id). */
  @Get('templates')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  findTemplates() {
    return this.spaces.findTemplates();
  }

  @Get(':spaceId')
  @RequireAnyRole()
  findOne(@Param('spaceId') spaceId: string) {
    return this.spaces.findOne(spaceId);
  }

  @Post()
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  create(@Body({ schema: zSpaceCreate }) body: SpaceCreate) {
    return this.spaces.create(body.name, body.template);
  }

  @Patch(':spaceId')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  update(@Param('spaceId') spaceId: string, @Body({ schema: zSpaceUpdate }) body: SpaceUpdate) {
    return this.spaces.rename(spaceId, body.name);
  }

  @Delete(':spaceId')
  @HttpCode(204)
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  async remove(@Param('spaceId') spaceId: string): Promise<void> {
    await this.spaces.remove(spaceId);
  }

  /** Same audience as reading the space: the dashboard shows it to anyone who opens it. */
  @Get(':spaceId/overview')
  @RequireAnyRole()
  findOverview(@Param('spaceId') spaceId: string) {
    return this.spaces.findOverview(spaceId);
  }
}
