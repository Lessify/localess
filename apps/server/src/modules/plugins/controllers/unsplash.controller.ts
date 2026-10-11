import { Controller, Get, Query } from '@nestjs/common';
import { z } from 'zod';
import { UserPermission } from '@localess/shared';
import { RequirePermission } from '../../../auth/decorators.js';
import { ZodValidationPipe } from '../../../infra/http/zod-validation.pipe.js';
import { UnsplashService } from '../services/unsplash.service.js';

const searchSchema = z.object({
  query: z.string().min(1).max(200),
  page: z.coerce.number().optional(),
  perPage: z.coerce.number().optional(),
  orientation: z.enum(['landscape', 'portrait', 'squarish']).optional(),
});

/**
 * Unsplash proxy for the asset picker (was the `unsplash-search` / `unsplash-random` callables).
 * ASSET_CREATE only: it spends the operator's API quota. The key comes from UNSPLASH_API_KEY.
 */
@Controller('api/app/plugins/unsplash')
@RequirePermission(UserPermission.ASSET_CREATE)
export class UnsplashController {
  constructor(private readonly unsplash: UnsplashService) {}

  @Get('search')
  search(@Query(new ZodValidationPipe(searchSchema)) query: z.infer<typeof searchSchema>) {
    return this.unsplash.search(query);
  }

  @Get('random')
  random() {
    return this.unsplash.random();
  }
}
