import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';
import { z } from 'zod';
import { UserPermission } from '@localess/shared';
import { RequireAnyRole, RequirePermission } from '../../../auth/decorators.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import { ZodValidationPipe } from '../../../infra/http/zod-validation.pipe.js';
import { zPreviewUrl } from '../../../infra/http/zod.js';
import { SpacesService } from '../services/spaces.service.js';

const createSchema = z.object({ name: z.string().trim().min(1).max(200) });
const updateSchema = z.object({ name: z.string().trim().min(1).max(200) }).strict();
const environmentSchema = z.object({ name: z.string().trim().min(1).max(200), url: zPreviewUrl });
const environmentOrderSchema = z.object({ ids: z.array(z.uuid()).min(1).max(1000) });
const localeIdSchema = z.object({ id: z.string().min(1).max(64) });
const localeOrderSchema = z.object({ ids: z.array(z.string().min(1).max(64)).min(1).max(1000) });

/** Spaces, their locales and environments, and the dashboard overview (was direct `spaces/{id}` writes plus the `space-calculateoverview` callable). */
@Controller('api/app/spaces')
export class SpacesController {
  constructor(private readonly spaces: SpacesService) {}

  @Get()
  @RequireAnyRole()
  list() {
    return this.spaces.list();
  }

  @Get(':spaceId')
  @RequireAnyRole()
  get(@Param('spaceId') spaceId: string) {
    return this.spaces.get(spaceId);
  }

  @Post()
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  create(@Body(new ZodValidationPipe(createSchema)) body: z.infer<typeof createSchema>) {
    return this.spaces.create(body.name);
  }

  @Patch(':spaceId')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  update(@Param('spaceId') spaceId: string, @Body(new ZodValidationPipe(updateSchema)) body: z.infer<typeof updateSchema>) {
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
    @Body(new ZodValidationPipe(environmentSchema)) body: z.infer<typeof environmentSchema>,
  ) {
    return this.spaces.createEnvironment(spaceId, body);
  }

  @Put(':spaceId/environments/order')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  reorderEnvironments(
    @Param('spaceId') spaceId: string,
    @Body(new ZodValidationPipe(environmentOrderSchema)) body: z.infer<typeof environmentOrderSchema>,
  ) {
    return this.spaces.reorderEnvironments(spaceId, body.ids);
  }

  @Patch(':spaceId/environments/:environmentId')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  updateEnvironment(
    @Param('spaceId') spaceId: string,
    @Param('environmentId', UuidParamPipe) environmentId: string,
    @Body(new ZodValidationPipe(environmentSchema)) body: z.infer<typeof environmentSchema>,
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
  addLocale(@Param('spaceId') spaceId: string, @Body(new ZodValidationPipe(localeIdSchema)) body: z.infer<typeof localeIdSchema>) {
    return this.spaces.addLocale(spaceId, body.id);
  }

  @Put(':spaceId/locales/order')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  reorderLocales(
    @Param('spaceId') spaceId: string,
    @Body(new ZodValidationPipe(localeOrderSchema)) body: z.infer<typeof localeOrderSchema>,
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
  setDefaultLocale(@Param('spaceId') spaceId: string, @Body(new ZodValidationPipe(localeIdSchema)) body: z.infer<typeof localeIdSchema>) {
    return this.spaces.setDefaultLocale(spaceId, body.id);
  }
}
