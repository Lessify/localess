import { Controller, Get, Query } from '@nestjs/common';
import { zUnsplashSearch } from '@localess/shared/zod';
import { type UnsplashSearch, UserPermission } from '@localess/shared';
import { RequirePermission } from '../../../auth/decorators.js';
import { UnsplashService } from '../services/unsplash.service.js';

/**
 * Unsplash proxy for the asset picker (was the `unsplash-search` / `unsplash-random` callables).
 * ASSET_CREATE only: it spends the operator's API quota. The key comes from UNSPLASH_API_KEY.
 */
@Controller('api/app/plugins/unsplash')
@RequirePermission(UserPermission.ASSET_CREATE)
export class UnsplashController {
  constructor(private readonly unsplash: UnsplashService) {}

  @Get('search')
  search(@Query({ schema: zUnsplashSearch }) query: UnsplashSearch) {
    return this.unsplash.search(query);
  }

  @Get('random')
  random() {
    return this.unsplash.random();
  }
}
