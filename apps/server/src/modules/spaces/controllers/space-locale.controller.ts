import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { zSpaceLocaleCreate, zSpaceLocaleOrder, zSpaceLocalePageable, zSpaceLocaleSetDefault } from '@localess/shared/zod';
import {
  type IdName,
  type Page,
  type Space,
  type SpaceLocale,
  type SpaceLocaleCreate,
  type SpaceLocaleOrder,
  type SpaceLocalePageable,
  type SpaceLocaleSetDefault,
  UserPermission,
} from '@localess/shared';
import { RequireAnyRole, RequirePermission } from '../../../auth/decorators.js';
import { SpaceLocaleService } from '../services/space-locale.service.js';

/** A space's locales and its default locale (the default is the space's `defaultLocaleId`). */
@Controller('api/app/spaces/:spaceId')
export class SpaceLocaleController {
  constructor(private readonly spaceLocaleService: SpaceLocaleService) {}

  /** One page for Space Settings → Locales: `?page=&size=&sort=&direction=` (Pageable), `?search=` (id or name). */
  @Get('locales')
  @RequireAnyRole()
  findAll(@Param('spaceId') spaceId: string, @Query({ schema: zSpaceLocalePageable }) query: SpaceLocalePageable): Promise<Page<SpaceLocale>> {
    return this.spaceLocaleService.findAll(spaceId, query);
  }

  /** Every locale of the space, in its order, as `{ id, name }`. */
  @Get('locales/names')
  @RequireAnyRole()
  findAllNames(@Param('spaceId') spaceId: string): Promise<IdName[]> {
    return this.spaceLocaleService.findAllNames(spaceId);
  }

  @Post('locales')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  create(@Param('spaceId') spaceId: string, @Body({ schema: zSpaceLocaleCreate }) body: SpaceLocaleCreate): Promise<SpaceLocale> {
    return this.spaceLocaleService.create(spaceId, body.id);
  }

  @Put('locales/order')
  @HttpCode(204)
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  async reorder(@Param('spaceId') spaceId: string, @Body({ schema: zSpaceLocaleOrder }) body: SpaceLocaleOrder): Promise<void> {
    await this.spaceLocaleService.reorder(spaceId, body.ids);
  }

  @Delete('locales/:localeId')
  @HttpCode(204)
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  async remove(@Param('spaceId') spaceId: string, @Param('localeId') localeId: string): Promise<void> {
    await this.spaceLocaleService.remove(spaceId, localeId);
  }

  @Put('default-locale')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  setDefault(@Param('spaceId') spaceId: string, @Body({ schema: zSpaceLocaleSetDefault }) body: SpaceLocaleSetDefault): Promise<Space> {
    return this.spaceLocaleService.setDefault(spaceId, body.id);
  }
}
