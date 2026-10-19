import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { type SpaceCreate, type SpaceEnvironmentInput, type SpaceUpdate, UserPermission } from '@localess/shared';
import { RequireAnyRole, RequirePermission } from '../../../auth/decorators.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import { ZodValidationPipe } from '../../../infra/http/zod-validation.pipe.js';
import { type EnvironmentOrder, zEnvironmentOrder, zSpaceEnvironmentInput } from '../models/environment.models.js';
import { type LocaleId, type LocaleOrder, zLocaleId, zLocaleOrder } from '../models/locale.models.js';
import { type SpacePageable, zSpaceCreate, zSpacePageable, zSpaceUpdate } from '../models/space.models.js';
import { SpacesService } from '../services/spaces.service.js';

/** Spaces, their locales and environments, and the dashboard overview (was direct `spaces/{id}` writes plus the `space-calculateoverview` callable). */
@Controller('api/app/spaces')
export class SpacesController {
  constructor(private readonly spaces: SpacesService) {}

  /** One page: `?page=&size=&sort=&direction=` (Pageable), `?search=` (name, or the id), `?importing=false`. */
  @Get()
  @RequireAnyRole()
  list(@Query(new ZodValidationPipe(zSpacePageable)) query: SpacePageable) {
    return this.spaces.page(query);
  }

  /** The templates a space may be created from (before `:spaceId`, which would take `templates` as an id). */
  @Get('templates')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  templates() {
    return this.spaces.templates();
  }

  @Get(':spaceId')
  @RequireAnyRole()
  get(@Param('spaceId') spaceId: string) {
    return this.spaces.get(spaceId);
  }

  @Post()
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  create(@Body(new ZodValidationPipe(zSpaceCreate)) body: SpaceCreate) {
    return this.spaces.create(body.name, body.template);
  }

  @Patch(':spaceId')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  update(@Param('spaceId') spaceId: string, @Body(new ZodValidationPipe(zSpaceUpdate)) body: SpaceUpdate) {
    return this.spaces.rename(spaceId, body.name);
  }

  @Delete(':spaceId')
  @HttpCode(204)
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  async delete(@Param('spaceId') spaceId: string): Promise<void> {
    await this.spaces.delete(spaceId);
  }

  /** Same audience as reading the space: the dashboard shows it to anyone who opens it. */
  @Get(':spaceId/overview')
  @RequireAnyRole()
  overview(@Param('spaceId') spaceId: string) {
    return this.spaces.overview(spaceId);
  }

  @Post(':spaceId/environments')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  createEnvironment(
    @Param('spaceId') spaceId: string,
    @Body(new ZodValidationPipe(zSpaceEnvironmentInput)) body: SpaceEnvironmentInput,
  ) {
    return this.spaces.createEnvironment(spaceId, body);
  }

  @Put(':spaceId/environments/order')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  reorderEnvironments(
    @Param('spaceId') spaceId: string,
    @Body(new ZodValidationPipe(zEnvironmentOrder)) body: EnvironmentOrder,
  ) {
    return this.spaces.reorderEnvironments(spaceId, body.ids);
  }

  @Patch(':spaceId/environments/:environmentId')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  updateEnvironment(
    @Param('spaceId') spaceId: string,
    @Param('environmentId', UuidParamPipe) environmentId: string,
    @Body(new ZodValidationPipe(zSpaceEnvironmentInput)) body: SpaceEnvironmentInput,
  ) {
    return this.spaces.updateEnvironment(spaceId, environmentId, body);
  }

  @Delete(':spaceId/environments/:environmentId')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  deleteEnvironment(@Param('spaceId') spaceId: string, @Param('environmentId', UuidParamPipe) environmentId: string) {
    return this.spaces.deleteEnvironment(spaceId, environmentId);
  }

  @Post(':spaceId/locales')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  addLocale(@Param('spaceId') spaceId: string, @Body(new ZodValidationPipe(zLocaleId)) body: LocaleId) {
    return this.spaces.addLocale(spaceId, body.id);
  }

  @Put(':spaceId/locales/order')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  reorderLocales(
    @Param('spaceId') spaceId: string,
    @Body(new ZodValidationPipe(zLocaleOrder)) body: LocaleOrder,
  ) {
    return this.spaces.reorderLocales(spaceId, body.ids);
  }

  @Delete(':spaceId/locales/:localeId')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  removeLocale(@Param('spaceId') spaceId: string, @Param('localeId') localeId: string) {
    return this.spaces.removeLocale(spaceId, localeId);
  }

  @Put(':spaceId/default-locale')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  setDefaultLocale(@Param('spaceId') spaceId: string, @Body(new ZodValidationPipe(zLocaleId)) body: LocaleId) {
    return this.spaces.setDefaultLocale(spaceId, body.id);
  }
}
