import type { IntegrationTestResult } from '@localess/shared';

import type { AppConfig } from '../../infra/config/config.js';
import {
  type IntegrationProvider,
  missing,
  type ProviderErrorKind,
  ProviderHttpError,
  TEST_TIMEOUT_MS,
  unexpected,
} from './integration-provider.js';

const APPLICATIONS_URL = 'https://unsplash.com/oauth/applications';

/** Unsplash: the app's Access Key (`Client-ID`). Demo apps get 50 requests an hour, Production 5,000. */
export class UnsplashIntegration implements IntegrationProvider {
  readonly id = 'unsplash' as const;

  constructor(private readonly config: Pick<AppConfig, 'unsplashApiUrl'>) {}

  /** GET `path` with the key; throws `ProviderHttpError` on an HTTP error. */
  async call(apiKey: string, path: string, params: Record<string, string> = {}, timeoutMs?: number): Promise<Response> {
    const url = new URL(path, this.config.unsplashApiUrl);
    for (const [key, value] of Object.entries(params)) url.searchParams.append(key, value);
    const response = await fetch(url, {
      headers: { 'Accept-Version': 'v1', Authorization: `Client-ID ${apiKey}` },
      ...(timeoutMs ? { signal: AbortSignal.timeout(timeoutMs) } : {}),
    });
    if (!response.ok) throw new ProviderHttpError(response.status, await response.text());
    return response;
  }

  validate(values: Record<string, string>): string | undefined {
    return values['apiKey']?.trim() ? undefined : missing('Access Key');
  }

  async test(values: Record<string, string>): Promise<IntegrationTestResult> {
    try {
      const response = await this.call(values['apiKey'] ?? '', '/photos', { per_page: '1' }, TEST_TIMEOUT_MS);
      const limit = Number(response.headers.get('X-RateLimit-Limit'));
      const demo = Number.isFinite(limit) && limit > 0 && limit <= 50;
      return demo
        ? {
            ok: true,
            message: 'Connected to Unsplash.',
            details: `Your Unsplash app is in Demo mode: ${limit} requests per hour. Apply for Production to get 5,000.`,
            fixUrl: APPLICATIONS_URL,
          }
        : {
            ok: true,
            message: 'Connected to Unsplash.',
            details: limit > 0 ? `${limit.toLocaleString('en-US')} requests per hour.` : undefined,
          };
    } catch (error) {
      switch (this.classify(error)) {
        case 'auth':
          return {
            ok: false,
            reason: 'auth',
            message: 'Unsplash rejected this key. Make sure you copied the Access Key, not the Secret Key.',
            fixUrl: APPLICATIONS_URL,
          };
        case 'quota':
          return { ok: false, reason: 'quota', message: "This Unsplash app's hourly request limit is reached. Try again within the hour." };
        case 'unreachable':
          return { ok: false, reason: 'unreachable', message: "Couldn't reach Unsplash. Your server may block outgoing traffic." };
        default:
          return unexpected('Unsplash', error);
      }
    }
  }

  classify(error: unknown): ProviderErrorKind {
    if (error instanceof ProviderHttpError) {
      if (error.status === 403 && /rate limit/i.test(error.body)) return 'quota';
      if (error.status === 401 || error.status === 403) return 'auth';
      if (error.status >= 500) return 'unreachable';
      return 'other';
    }
    // fetch: network failure (TypeError) or the timeout (AbortSignal).
    if (error instanceof TypeError || (error as Error | undefined)?.name === 'TimeoutError') return 'unreachable';
    return 'other';
  }
}
