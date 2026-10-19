import { Body, Controller, Delete, Param, Post, Put } from '@nestjs/common';
import { UserPermission } from '@localess/shared';
import { RequirePermission } from '../../../auth/decorators.js';
import { type LocaleId, type LocaleOrder, zLocaleId, zLocaleOrder } from '../models/space-locale.models.js';
import { SpaceLocaleService } from '../services/space-locale.service.js';

/** A space's locales and its default locale; every route answers the space as it is after the change. */
@Controller('api/app/spaces/:spaceId')
export class SpaceLocaleController {
  constructor(private readonly locales: SpaceLocaleService) {}

  @Post('locales')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  create(@Param('spaceId') spaceId: string, @Body({ schema: zLocaleId }) body: LocaleId) {
    return this.locales.create(spaceId, body.id);
  }

  @Put('locales/order')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  reorder(@Param('spaceId') spaceId: string, @Body({ schema: zLocaleOrder }) body: LocaleOrder) {
    return this.locales.reorder(spaceId, body.ids);
  }

  @Delete('locales/:localeId')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  remove(@Param('spaceId') spaceId: string, @Param('localeId') localeId: string) {
    return this.locales.remove(spaceId, localeId);
  }

  @Put('default-locale')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  setDefault(@Param('spaceId') spaceId: string, @Body({ schema: zLocaleId }) body: LocaleId) {
    return this.locales.setDefault(spaceId, body.id);
  }
}
