import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { zSpaceCreate, zSpaceDefaultLocaleUpdate, zSpacePageable, zSpaceUpdate } from '@localess/shared/zod';
import {
  type IdName,
  type Page,
  type Space,
  type SpaceCreate,
  type SpaceDefaultLocaleUpdate,
  type SpaceOverview,
  type SpacePageable,
  type SpaceTemplateId,
  type SpaceUpdate,
  UserPermission,
} from '@localess/shared';
import { RequireAnyRole, RequirePermission } from '../../../auth/decorators.js';
import { SpaceService } from '../services/space.service.js';

/** Spaces and the dashboard overview (their locales and environments: `SpaceLocaleController`, `SpaceEnvironmentController`) (was direct `spaces/{id}` writes plus the `space-calculateoverview` callable). */
@Controller('api/app/spaces')
export class SpaceController {
  constructor(private readonly spaceService: SpaceService) {}

  /**
   * One page for Admin → Spaces: `?page=&size=&sort=&direction=` (Pageable), `?search=` (name, or the id),
   * `?importing=false`. SPACE_MANAGEMENT only: each item carries its Firebase import (who ran it, from where).
   */
  @Get()
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  findAll(@Query({ schema: zSpacePageable }) query: SpacePageable): Promise<Page<Space>> {
    return this.spaceService.findAll(query);
  }

  /** Every space that can be opened, as `{ id, name }`: the sidebar's list (before `:spaceId`, as `templates`). */
  @Get('names')
  @RequireAnyRole()
  findAllNames(): Promise<IdName[]> {
    return this.spaceService.findAllNames();
  }

  /** The templates a space may be created from (before `:spaceId`, which would take `templates` as an id). */
  @Get('templates')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  findTemplates(): SpaceTemplateId[] {
    return this.spaceService.findTemplates();
  }

  @Get(':spaceId')
  @RequireAnyRole()
  findOne(@Param('spaceId') spaceId: string): Promise<Space> {
    return this.spaceService.findOne(spaceId);
  }

  @Post()
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  create(@Body({ schema: zSpaceCreate }) body: SpaceCreate): Promise<Space> {
    return this.spaceService.create(body.name, body.template);
  }

  @Patch(':spaceId')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  update(@Param('spaceId') spaceId: string, @Body({ schema: zSpaceUpdate }) body: SpaceUpdate): Promise<Space> {
    return this.spaceService.rename(spaceId, body.name);
  }

  /** Apart from `PATCH`: a different process (the locale must be the space's; the drafts that read the default go). */
  @Put(':spaceId/default-locale')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  setDefaultLocale(@Param('spaceId') spaceId: string, @Body({ schema: zSpaceDefaultLocaleUpdate }) body: SpaceDefaultLocaleUpdate): Promise<Space> {
    return this.spaceService.setDefaultLocale(spaceId, body.id);
  }

  @Delete(':spaceId')
  @HttpCode(204)
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  async remove(@Param('spaceId') spaceId: string): Promise<void> {
    await this.spaceService.remove(spaceId);
  }

  /** Same audience as reading the space: the dashboard shows it to anyone who opens it. */
  @Get(':spaceId/overview')
  @RequireAnyRole()
  findOverview(@Param('spaceId') spaceId: string): Promise<SpaceOverview> {
    return this.spaceService.findOverview(spaceId);
  }
}
