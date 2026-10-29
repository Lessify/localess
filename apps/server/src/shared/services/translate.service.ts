import {
  DEEPL_SOURCE_SUPPORT_LOCALES,
  DEEPL_TARGET_SUPPORT_LOCALES,
  GCP_SOURCE_SUPPORT_LOCALES,
  GCP_TARGET_SUPPORT_LOCALES,
  TranslateBatchResult,
  TranslateFormat,
  TranslateItem,
} from '@localess/shared';
import { BadRequestException, HttpException, HttpStatus, Inject, Injectable, PreconditionFailedException } from '@nestjs/common';
import type { Translator } from 'deepl-node';

import { APP_CONFIG, type AppConfig } from '../../infra/config/config.js';
import { INTEGRATION_PROVIDERS, type IntegrationProviders } from '../integrations/integration-providers.js';
import { translateItems } from '../utils/translate-batch.js';
import { deeplTranslateOptions, googleMimeType } from '../utils/translate-format.utils.js';
import { IntegrationService, type ResolvedIntegration } from './integration.service.js';

/** A Google client with the project and location it translates in. */
type GoogleClient = Awaited<ReturnType<IntegrationProviders['google-translate']['client']>>;

/** 412: the request is fine, no translation provider is connected. */
const notConfigured = () =>
  new PreconditionFailedException(
    'Machine translation is not set up. Ask an admin to connect DeepL or Google in Admin → Settings → Integrations.',
  );

/** 424: no provider could serve the request (key, quota, API off, network). */
class ProviderError extends HttpException {
  constructor() {
    super(
      {
        statusCode: HttpStatus.FAILED_DEPENDENCY,
        error: 'Failed Dependency',
        message: 'Machine translation is unavailable. Ask an admin to check Admin → Settings → Integrations.',
      },
      HttpStatus.FAILED_DEPENDENCY,
    );
  }
}

type TranslationId = 'deepl' | 'google-translate';
const TRANSLATION_IDS: TranslationId[] = ['deepl', 'google-translate'];
const NAMES: Record<TranslationId, string> = { deepl: 'DeepL', 'google-translate': 'Google Cloud Translation' };

/** The languages each provider takes, by direction. */
const SUPPORT: Record<TranslationId, { sources: Set<string>; targets: Set<string> }> = {
  deepl: { sources: DEEPL_SOURCE_SUPPORT_LOCALES, targets: DEEPL_TARGET_SUPPORT_LOCALES },
  'google-translate': { sources: GCP_SOURCE_SUPPORT_LOCALES, targets: GCP_TARGET_SUPPORT_LOCALES },
};

const supports = (id: TranslationId, source: string | null, target: string): boolean =>
  (!source || SUPPORT[id].sources.has(source)) && SUPPORT[id].targets.has(target);

/**
 * Machine translation over the connected providers (`IntegrationService`, env or Admin → Settings): the primary for a pair
 * it supports, else the other one; a primary failing on its key, quota or network hands the request to the other.
 */
@Injectable()
export class TranslateService {
  /** One client per provider, rebuilt when its values change. */
  private readonly clients = new Map<TranslationId, { fingerprint: string; client: Promise<Translator | GoogleClient> }>();

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly integrationService: IntegrationService,
    @Inject(INTEGRATION_PROVIDERS) private readonly providers: IntegrationProviders,
  ) {}

  /** Throws 412 when no provider is connected: the UI keeps its Translate actions and explains this on use. */
  async requireProvider(): Promise<void> {
    if (this.config.translateStub) return;
    if (!(await this.connected()).length) throw notConfigured();
  }

  /** The locales the connected providers can translate from and to, for the web's Translate buttons. */
  async translatableLocales(): Promise<{ sourceLocales: string[]; targetLocales: string[] }> {
    const ids = this.config.translateStub ? (['google-translate'] as TranslationId[]) : (await this.connected()).map(it => it.id);
    const sources = new Set(ids.flatMap(id => [...SUPPORT[id].sources]));
    const targets = new Set(ids.flatMap(id => [...SUPPORT[id].targets]));
    return { sourceLocales: [...sources].sort(), targetLocales: [...targets].sort() };
  }

  /** Same marker the emulator stub produced, valid for the format. */
  private stub(content: string, sourceLocale: string | null, targetLocale: string, format: TranslateFormat): string {
    return format === 'html'
      ? `${content}<p><em>${sourceLocale} -&gt; ${targetLocale}</em></p>`
      : `${content} : ${sourceLocale} -> ${targetLocale}`;
  }

  /**
   * Many strings in one provider round-trip, results in input order. `sourceLocale` null = auto-detect. `failed` holds the
   * providers that already failed in this request (a batch skips them for its remaining chunks).
   */
  async translateBatch(
    contents: string[],
    sourceLocale: string | null,
    targetLocale: string,
    format: TranslateFormat = 'text',
    failed: Set<TranslationId> = new Set(),
  ): Promise<string[]> {
    if (!contents.length) return [];
    if (this.config.translateStub) return contents.map(content => this.stub(content, sourceLocale, targetLocale, format));
    const connected = await this.connected();
    if (!connected.length) throw notConfigured();
    const candidates = connected.filter(it => supports(it.id, sourceLocale, targetLocale));
    if (!candidates.length) {
      const sourceKnown = !sourceLocale || connected.some(it => SUPPORT[it.id].sources.has(sourceLocale));
      throw new BadRequestException(
        sourceKnown ? `Unsupported target locale : '${targetLocale}'` : `Unsupported source locale : '${sourceLocale}'`,
      );
    }
    for (const provider of candidates) {
      if (failed.has(provider.id)) continue;
      try {
        const result = await this.call(provider, contents, sourceLocale, targetLocale, format);
        await this.integrationService.recordOutcome(provider.id, { ok: true });
        return result;
      } catch (error) {
        const kind = this.providers[provider.id].classify(error);
        if (kind === 'other') throw new ProviderError();
        failed.add(provider.id);
        if (kind === 'auth') await this.record(provider.id, 'auth', `${NAMES[provider.id]} rejected the key during a translation.`);
        if (kind === 'quota') await this.record(provider.id, 'quota', `${NAMES[provider.id]}'s quota is used up.`);
      }
    }
    throw new ProviderError();
  }

  async translate(content: string, sourceLocale: string | null, targetLocale: string, format: TranslateFormat = 'text'): Promise<string> {
    return (await this.translateBatch([content], sourceLocale, targetLocale, format))[0] ?? '';
  }

  /** Grouped by format, chunked to the provider cap; a failing chunk only fails its own items. */
  async translateItems(items: TranslateItem[], sourceLocale: string, targetLocale: string): Promise<TranslateBatchResult> {
    await this.requireProvider();
    const failed = new Set<TranslationId>();
    return translateItems(items, sourceLocale, targetLocale, (contents, source, target, format) =>
      this.translateBatch(contents, source, target, format, failed),
    );
  }

  /** The connected translation providers, the primary first. */
  private async connected(): Promise<(ResolvedIntegration & { id: TranslationId })[]> {
    const primary = (await this.integrationService.translatePrimary()).value;
    const resolved = await Promise.all(TRANSLATION_IDS.map(id => this.integrationService.resolve(id)));
    return resolved
      .filter((it): it is ResolvedIntegration & { id: TranslationId } => it !== undefined)
      .sort((a, b) => Number(b.id === primary) - Number(a.id === primary));
  }

  private record(id: TranslationId, reason: 'auth' | 'quota', message: string): Promise<void> {
    return this.integrationService.recordOutcome(id, { ok: false, reason, message });
  }

  private async call(
    provider: ResolvedIntegration & { id: TranslationId },
    contents: string[],
    sourceLocale: string | null,
    targetLocale: string,
    format: TranslateFormat,
  ): Promise<string[]> {
    if (provider.id === 'deepl') {
      const deepl = (await this.client(provider)) as Translator;
      const results = await deepl.translateText(contents, sourceLocale as never, targetLocale as never, deeplTranslateOptions(format));
      return results.map(it => it.text);
    }
    const google = (await this.client(provider)) as GoogleClient;
    const [response] = await google.client.translateText({
      parent: `projects/${google.projectId}/locations/${google.location}`,
      contents,
      mimeType: googleMimeType(format),
      sourceLanguageCode: sourceLocale ?? undefined,
      targetLanguageCode: targetLocale,
    });
    return (response.translations ?? []).map(it => it.translatedText || '');
  }

  private client(provider: ResolvedIntegration & { id: TranslationId }): Promise<Translator | GoogleClient> {
    const fingerprint = JSON.stringify(provider.values);
    const cached = this.clients.get(provider.id);
    if (cached?.fingerprint === fingerprint) return cached.client;
    const client: Promise<Translator | GoogleClient> =
      provider.id === 'deepl'
        ? this.providers.deepl.translator(provider.values['apiKey'] ?? '')
        : this.providers['google-translate'].client(provider.values);
    this.clients.set(provider.id, { fingerprint, client });
    client.catch(() => this.clients.delete(provider.id));
    return client;
  }
}
