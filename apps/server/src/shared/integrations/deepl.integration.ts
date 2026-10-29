import type { IntegrationTestResult } from '@localess/shared';
import type { Translator, TranslatorOptions } from 'deepl-node';

import type { AppConfig } from '../../infra/config/config.js';
import { type IntegrationProvider, missing, type ProviderErrorKind, TEST_TIMEOUT_MS, unexpected } from './integration-provider.js';

/** DeepL: the key alone. A Free key ends in `:fx`. */
export class DeeplIntegration implements IntegrationProvider {
  readonly id = 'deepl' as const;

  constructor(private readonly config: Pick<AppConfig, 'deeplApiUrl'>) {}

  /** A translator for this key; `test` doesn't retry, so an unreachable DeepL answers within the timeout. */
  async translator(apiKey: string, options: TranslatorOptions = {}): Promise<Translator> {
    const { Translator } = await import('deepl-node');
    return new Translator(apiKey, { ...(this.config.deeplApiUrl ? { serverUrl: this.config.deeplApiUrl } : {}), ...options });
  }

  validate(values: Record<string, string>): string | undefined {
    return values['apiKey']?.trim() ? undefined : missing('API key');
  }

  async test(values: Record<string, string>): Promise<IntegrationTestResult> {
    const apiKey = values['apiKey'] ?? '';
    try {
      const translator = await this.translator(apiKey, { maxRetries: 0, minTimeout: TEST_TIMEOUT_MS });
      const usage = await translator.getUsage();
      const plan = apiKey.endsWith(':fx') ? 'Free' : 'Pro';
      const character = usage.character;
      const used = character
        ? ` ${character.count.toLocaleString('en-US')} of ${character.limit.toLocaleString('en-US')} characters used this month.`
        : '';
      return { ok: true, message: `Connected to DeepL ${plan}.`, details: `DeepL ${plan} plan.${used}` };
    } catch (error) {
      switch (this.classify(error)) {
        case 'auth':
          return {
            ok: false,
            reason: 'auth',
            message: 'DeepL rejected this key. Copy the Authentication Key from your DeepL account (API Keys).',
            fixUrl: 'https://www.deepl.com/your-account/keys',
          };
        case 'quota':
          return { ok: false, reason: 'quota', message: "This DeepL key's character quota for the month is used up." };
        case 'unreachable':
          return { ok: false, reason: 'unreachable', message: "Couldn't reach DeepL. Your server may block outgoing traffic." };
        default:
          return unexpected('DeepL', error);
      }
    }
  }

  classify(error: unknown): ProviderErrorKind {
    switch ((error as Error | undefined)?.constructor?.name) {
      case 'AuthorizationError':
        return 'auth';
      case 'QuotaExceededError':
        return 'quota';
      // 429 is DeepL under load, not the account's quota: the other provider takes it, nothing is recorded.
      case 'TooManyRequestsError':
      case 'ConnectionError':
        return 'unreachable';
      case 'DeepLError':
        // deepl-node throws a plain DeepLError for 503 ("Service unavailable") and other 5xx ("Unexpected status code: 5xx").
        return /^Service unavailable|^Unexpected status code: 5\d\d/.test((error as Error).message) ? 'unreachable' : 'other';
      default:
        return 'other';
    }
  }
}
