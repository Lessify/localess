import type { UnsplashPhoto, UnsplashRandomResult, UnsplashSearch, UnsplashSearchResult } from '@localess/shared';
import { HttpException, HttpStatus, Inject, Injectable, NotImplementedException } from '@nestjs/common';

import { APP_CONFIG, type AppConfig } from '../../../infra/config/config.js';
import { normalizePaging } from '../utils/unsplash-paging.js';

/** What Unsplash answered, with the rate limit of the operator's key. */
interface UnsplashResponse<T> {
  limit?: number;
  remaining?: number;
  body: T;
}

/** Unsplash search for the asset picker, with the operator's key (UNSPLASH_API_KEY); the rate limit is passed on. */
@Injectable()
export class UnsplashService {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  async search(query: UnsplashSearch): Promise<UnsplashSearchResult> {
    const { page, perPage } = normalizePaging(query.page, query.perPage);
    const params: Record<string, string> = { query: query.query, per_page: String(perPage) };
    if (page) params['page'] = String(page);
    if (query.orientation) params['orientation'] = query.orientation;
    const { limit, remaining, body } = await this.call<Omit<UnsplashSearchResult, 'limit' | 'remaining'>>('/search/photos', params);
    return { limit, remaining, ...body };
  }

  async random(): Promise<UnsplashRandomResult> {
    const { limit, remaining, body } = await this.call<UnsplashPhoto[]>('/photos/random', { count: '20' });
    return { limit, remaining, results: body };
  }

  private async call<T>(path: string, params: Record<string, string>): Promise<UnsplashResponse<T>> {
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
      limit: rateLimit(response.headers.get('X-RateLimit-Limit')),
      remaining: rateLimit(response.headers.get('X-RateLimit-Remaining')),
      body: (await response.json()) as T,
    };
  }
}

/** A rate-limit header as a number; `undefined` when absent or not a number. */
function rateLimit(header: string | null): number | undefined {
  if (header === null) return undefined;
  const value = Number(header);
  return Number.isFinite(value) ? value : undefined;
}
