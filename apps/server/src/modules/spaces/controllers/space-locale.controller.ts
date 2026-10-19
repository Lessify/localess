import { Body, Controller, Delete, Param, Post, Put } from '@nestjs/common';
import { zSpaceLocaleCreate, zSpaceLocaleOrder, zSpaceLocaleSetDefault } from '@localess/shared/zod';
import { type SpaceLocaleCreate, type SpaceLocaleOrder, type SpaceLocaleSetDefault, UserPermission } from '@localess/shared';
import { RequirePermission } from '../../../auth/decorators.js';
import { SpaceLocaleService } from '../services/space-locale.service.js';

/** A space's locales and its default locale; every route answers the space as it is after the change. */
@Controller('api/app/spaces/:spaceId')
export class SpaceLocaleController {
  constructor(private readonly spaceLocaleService: SpaceLocaleService) {}

  @Post('locales')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  create(@Param('spaceId') spaceId: string, @Body({ schema: zSpaceLocaleCreate }) body: SpaceLocaleCreate) {
    return this.spaceLocaleService.create(spaceId, body.id);
  }

  @Put('locales/order')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  reorder(@Param('spaceId') spaceId: string, @Body({ schema: zSpaceLocaleOrder }) body: SpaceLocaleOrder) {
    return this.spaceLocaleService.reorder(spaceId, body.ids);
  }

  @Delete('locales/:localeId')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  remove(@Param('spaceId') spaceId: string, @Param('localeId') localeId: string) {
    return this.spaceLocaleService.remove(spaceId, localeId);
  }

  @Put('default-locale')
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  setDefault(@Param('spaceId') spaceId: string, @Body({ schema: zSpaceLocaleSetDefault }) body: SpaceLocaleSetDefault) {
    return this.spaceLocaleService.setDefault(spaceId, body.id);
  }
}
