import type { UnsplashPhoto, UnsplashRandomResult, UnsplashSearch, UnsplashSearchResult } from '@localess/shared';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';

import { INTEGRATION_PROVIDERS, type IntegrationProviders } from '../../../shared/integrations/integration-providers.js';
import { IntegrationService } from '../../../shared/services/integration.service.js';
import { normalizePaging } from '../utils/unsplash-paging.js';

/** What Unsplash answered, with the rate limit of the operator's key. */
interface UnsplashResponse<T> {
  limit?: number;
  remaining?: number;
  body: T;
}

/** 424: Unsplash is off, or couldn't serve the request (key, rate limit, network). */
const unavailable = () =>
  new HttpException(
    {
      statusCode: HttpStatus.FAILED_DEPENDENCY,
      error: 'Failed Dependency',
      message: 'Unsplash is unavailable. Ask an admin to check Admin → Settings → Integrations.',
    },
    HttpStatus.FAILED_DEPENDENCY,
  );

/**
 * Unsplash search for the asset picker, with the key of the Unsplash integration (env or Admin → Settings); the rate
 * limit is passed on, and what Unsplash answers keeps the integration's status current.
 */
@Injectable()
export class UnsplashService {
  constructor(
    private readonly integrationService: IntegrationService,
    @Inject(INTEGRATION_PROVIDERS) private readonly providers: IntegrationProviders,
  ) {}

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
    const integration = await this.integrationService.resolve('unsplash');
    if (!integration) throw unavailable();
    const provider = this.providers.unsplash;
    let response: Response;
    try {
      response = await provider.call(integration.values['apiKey'] ?? '', path, params);
    } catch (error) {
      const kind = provider.classify(error);
      if (kind === 'auth')
        await this.integrationService.recordOutcome('unsplash', { ok: false, reason: 'auth', message: 'Unsplash rejected the key.' });
      if (kind === 'quota') {
        await this.integrationService.recordOutcome('unsplash', {
          ok: false,
          reason: 'quota',
          message: "Unsplash's hourly request limit is reached.",
        });
      }
      throw unavailable();
    }
    await this.integrationService.recordOutcome('unsplash', { ok: true });
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
