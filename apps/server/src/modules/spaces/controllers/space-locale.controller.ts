import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { zSpaceLocaleCreate, zSpaceLocaleOrder, zSpaceLocalePageable } from '@localess/shared/zod';
import {
  type IdName,
  type Page,
  type SpaceLocale,
  type SpaceLocaleCreate,
  type SpaceLocaleOrder,
  type SpaceLocalePageable,
  UserPermission,
} from '@localess/shared';
import { RequireAnyRole, RequirePermission } from '../../../auth/decorators.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import { SpaceLocaleService } from '../services/space-locale.service.js';

/** A space's locales (the default locale is the space's `defaultLocaleId`: `SpaceController.setDefaultLocale`). */
@Controller('api/app/spaces/:spaceId/locales')
export class SpaceLocaleController {
  constructor(private readonly spaceLocaleService: SpaceLocaleService) {}

  /** One page for Space Settings → Locales: `?page=&size=&sort=&direction=` (Pageable), `?search=` (id or name). */
  @Get()
  @RequireAnyRole()
  findAll(@Param('spaceId', UuidParamPipe) spaceId: string, @Query({ schema: zSpaceLocalePageable }) query: SpaceLocalePageable): Promise<Page<SpaceLocale>> {
    return this.spaceLocaleService.findAll(spaceId, query);
  }

  /** Every locale of the space, in its order, as `{ id, name }`. */
  @Get('names')
  @RequireAnyRole()
  findAllNames(@Param('spaceId', UuidParamPipe) spaceId: string): Promise<IdName[]> {
    return this.spaceLocaleService.findAllNames(spaceId);
  }

  @Post()
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  create(@Param('spaceId', UuidParamPipe) spaceId: string, @Body({ schema: zSpaceLocaleCreate }) body: SpaceLocaleCreate): Promise<SpaceLocale> {
    return this.spaceLocaleService.create(spaceId, body);
  }

  @Put('order')
  @HttpCode(204)
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  async reorder(@Param('spaceId', UuidParamPipe) spaceId: string, @Body({ schema: zSpaceLocaleOrder }) body: SpaceLocaleOrder): Promise<void> {
    await this.spaceLocaleService.reorder(spaceId, body);
  }

  @Delete(':localeId')
  @HttpCode(204)
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  async remove(@Param('spaceId', UuidParamPipe) spaceId: string, @Param('localeId') localeId: string): Promise<void> {
    await this.spaceLocaleService.remove(spaceId, localeId);
  }
}
