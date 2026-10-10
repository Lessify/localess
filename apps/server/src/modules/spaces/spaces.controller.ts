import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';
import { z } from 'zod';
import { UserPermission } from '@localess/shared';
import { RequireAnyRole, RequirePermission } from '../../auth/decorators.js';
import { ZodValidationPipe } from '../../infra/http/zod-validation.pipe.js';
import { zPreviewUrl } from '../../infra/http/zod.js';
import { spaceDto, SpacesService } from './spaces.service.js';

const createSchema = z.object({ name: z.string().trim().min(1).max(200) });
const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    environments: z.array(z.object({ name: z.string().trim().min(1).max(200), url: zPreviewUrl })).optional(),
  })
  .refine(it => it.name !== undefined || it.environments !== undefined, 'Nothing to update');
const localeIdSchema = z.object({ id: z.string().min(1).max(64) });
const localeOrderSchema = z.object({ ids: z.array(z.string().min(1).max(64)).min(1).max(1000) });

/** Spaces and their locales (was direct `spaces/{id}` writes plus the `space-calculateoverview` callable). */
@Controller('api/app/spaces')
export class SpacesController {
  constructor(private readonly spaces: SpacesService) {}

  @Get()
  @RequireAnyRole()
  async list() {
    return (await this.spaces.list()).map(spaceDto);
  }

  @Get(':spaceId')
  @RequireAnyRole()
  async get(@Param('spaceId') spaceId: string) {
    return spaceDto(await this.spaces.get(spaceId));
  }

  @Post()
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  async create(@Body(new ZodValidationPipe(createSchema)) body: z.infer<typeof createSchema>) {
    return spaceDto(await this.spaces.create(body.name));
  }

  @Patch(':spaceId')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  async update(@Param('spaceId') spaceId: string, @Body(new ZodValidationPipe(updateSchema)) body: z.infer<typeof updateSchema>) {
    let space = body.name !== undefined ? await this.spaces.rename(spaceId, body.name) : undefined;
    if (body.environments !== undefined) space = await this.spaces.updateEnvironments(spaceId, body.environments);
    return spaceDto(space!);
  }

  @Delete(':spaceId')
  @HttpCode(204)
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  async delete(@Param('spaceId') spaceId: string): Promise<void> {
    await this.spaces.delete(spaceId);
  }

  /** Same audience as reading the space: the dashboard recalculates for anyone who opens it. */
  @Post(':spaceId/overview')
  @HttpCode(200)
  @RequireAnyRole()
  async overview(@Param('spaceId') spaceId: string) {
    return spaceDto(await this.spaces.calculateOverview(spaceId));
  }

  @Post(':spaceId/locales')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  async addLocale(@Param('spaceId') spaceId: string, @Body(new ZodValidationPipe(localeIdSchema)) body: z.infer<typeof localeIdSchema>) {
    return spaceDto(await this.spaces.addLocale(spaceId, body.id));
  }

  @Put(':spaceId/locales/order')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  async reorderLocales(
    @Param('spaceId') spaceId: string,
    @Body(new ZodValidationPipe(localeOrderSchema)) body: z.infer<typeof localeOrderSchema>,
  ) {
    return spaceDto(await this.spaces.reorderLocales(spaceId, body.ids));
  }

  @Delete(':spaceId/locales/:localeId')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  async removeLocale(@Param('spaceId') spaceId: string, @Param('localeId') localeId: string) {
    return spaceDto(await this.spaces.removeLocale(spaceId, localeId));
  }

  @Put(':spaceId/default-locale')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  async setDefaultLocale(
    @Param('spaceId') spaceId: string,
    @Body(new ZodValidationPipe(localeIdSchema)) body: z.infer<typeof localeIdSchema>,
  ) {
    return spaceDto(await this.spaces.setDefaultLocale(spaceId, body.id));
  }
}
