import { CONTENT_WRITERS, type UnsplashRandomResult, type UnsplashSearch, type UnsplashSearchResult } from '@localess/shared';
import { zUnsplashSearch } from '@localess/shared/zod';
import { Controller, Get, Query } from '@nestjs/common';

import { RequireRole } from '../../../auth/decorators.js';
import { UnsplashService } from '../services/unsplash.service.js';

/**
 * Unsplash proxy for the asset picker (was the `unsplash-search` / `unsplash-random` callables). Content writers only:
 * it spends the operator's API quota. The key comes from UNSPLASH_API_KEY.
 */
@Controller('api/app/plugins/unsplash')
@RequireRole(CONTENT_WRITERS)
export class UnsplashController {
  constructor(private readonly unsplashService: UnsplashService) {}

  @Get('search')
  search(@Query({ schema: zUnsplashSearch }) query: UnsplashSearch): Promise<UnsplashSearchResult> {
    return this.unsplashService.search(query);
  }

  @Get('random')
  random(): Promise<UnsplashRandomResult> {
    return this.unsplashService.random();
  }
}
