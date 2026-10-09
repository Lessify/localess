import { Controller, Get, HttpException, HttpStatus, Inject, NotImplementedException, Query } from '@nestjs/common';
import { z } from 'zod';
import { UserPermission } from '@localess/shared';
import { RequirePermission } from '../../auth/decorators.js';
import { ZodValidationPipe } from '../../infra/http/zod-validation.pipe.js';
import { APP_CONFIG, AppConfig } from '../../infra/config/config.js';
import { normalizePaging } from './unsplash-paging.js';

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
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  private async call(
    path: string,
    params: Record<string, string>,
  ): Promise<{ limit: string | null; remaining: string | null; body: unknown }> {
    const unsplash = this.config.unsplash;
    if (!unsplash) throw new NotImplementedException('Unsplash is not configured (set UNSPLASH_API_KEY)');
    const url = new URL(path, unsplash.apiUrl);
    for (const [key, value] of Object.entries(params)) url.searchParams.append(key, value);
    const response = await fetch(url, { headers: { 'Accept-Version': 'v1', Authorization: `Client-ID ${unsplash.apiKey}` } });
    if (!response.ok) {
      throw new HttpException(
        { statusCode: HttpStatus.FAILED_DEPENDENCY, message: 'Unsplash API Key is not configured properly.' },
        HttpStatus.FAILED_DEPENDENCY,
      );
    }
    return {
      limit: response.headers.get('X-RateLimit-Limit'),
      remaining: response.headers.get('X-RateLimit-Remaining'),
      body: await response.json(),
    };
  }

  @Get('search')
  async search(@Query(new ZodValidationPipe(searchSchema)) query: z.infer<typeof searchSchema>) {
    const { page, perPage } = normalizePaging(query.page, query.perPage);
    const params: Record<string, string> = { query: query.query, per_page: String(perPage) };
    if (page) params['page'] = String(page);
    if (query.orientation) params['orientation'] = query.orientation;
    const { limit, remaining, body } = await this.call('/search/photos', params);
    return { limit, remaining, ...(body as object) };
  }

  @Get('random')
  async random() {
    const { limit, remaining, body } = await this.call('/photos/random', { count: '20' });
    return { limit, remaining, results: body };
  }
}
