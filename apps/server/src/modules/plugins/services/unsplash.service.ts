import { HttpException, HttpStatus, Inject, Injectable, NotImplementedException } from '@nestjs/common';

import { APP_CONFIG, type AppConfig } from '../../../infra/config/config.js';
import { normalizePaging } from '../utils/unsplash-paging.js';

/** Unsplash search for the asset picker, with the operator's key (UNSPLASH_API_KEY); the rate limit is passed on. */
@Injectable()
export class UnsplashService {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  async search(query: { query: string; page?: number; perPage?: number; orientation?: string }) {
    const { page, perPage } = normalizePaging(query.page, query.perPage);
    const params: Record<string, string> = { query: query.query, per_page: String(perPage) };
    if (page) params['page'] = String(page);
    if (query.orientation) params['orientation'] = query.orientation;
    const { limit, remaining, body } = await this.call('/search/photos', params);
    return { limit, remaining, ...(body as object) };
  }

  async random() {
    const { limit, remaining, body } = await this.call('/photos/random', { count: '20' });
    return { limit, remaining, results: body };
  }

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
}
