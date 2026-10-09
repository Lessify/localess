import { BadRequestException, HttpException, HttpStatus, Inject, Injectable, NotImplementedException } from '@nestjs/common';
import type { TranslationServiceClient } from '@google-cloud/translate';
import type { Translator } from 'deepl-node';
import { APP_CONFIG, AppConfig } from '../config/config.js';
import { translateItems } from '../domain/lib/translate-batch.js';
import { deeplTranslateOptions, googleMimeType } from '../domain/lib/translate-format.utils.js';
import {
  DEEPL_SOURCE_SUPPORT_LOCALES,
  DEEPL_TARGET_SUPPORT_LOCALES,
  GCP_SOURCE_SUPPORT_LOCALES,
  GCP_TARGET_SUPPORT_LOCALES,
} from '../domain/lib/translate-locales.js';
import { TranslateBatchResult, TranslateFormat, TranslateItem } from '../domain/models/index.js';

/** 424 like the callable's `failed-precondition`: the provider rejected the request (key, quota, API off). */
class ProviderError extends HttpException {
  constructor(message: string) {
    super({ statusCode: HttpStatus.FAILED_DEPENDENCY, error: 'Failed Dependency', message }, HttpStatus.FAILED_DEPENDENCY);
  }
}

/**
 * Machine translation (was the `translate` callable and `translateWithGoogle`). DeepL when an API key
 * is configured, otherwise Google Cloud Translation v3; the provider is fixed at boot from env
 * (it used to be read from Remote Config on every call).
 */
@Injectable()
export class TranslateService {
  private deepl?: Translator;
  private google?: TranslationServiceClient;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  get enabled(): boolean {
    return this.config.translate.provider !== 'none';
  }

  get provider(): AppConfig['translate']['provider'] {
    return this.config.translate.provider;
  }

  /** Same marker the emulator stub produced, valid for the format. */
  private stub(content: string, sourceLocale: string | null, targetLocale: string, format: TranslateFormat): string {
    return format === 'html'
      ? `${content}<p><em>${sourceLocale} -&gt; ${targetLocale}</em></p>`
      : `${content} : ${sourceLocale} -> ${targetLocale}`;
  }

  private checkLocales(source: string | null, target: string, sources: Set<string>, targets: Set<string>): void {
    if (source && !sources.has(source)) throw new BadRequestException(`Unsupported source locale : '${source}'`);
    if (!targets.has(target)) throw new BadRequestException(`Unsupported target locale : '${target}'`);
  }

  /** Many strings in one provider round-trip, results in input order. `sourceLocale` null = auto-detect. */
  async translateBatch(
    contents: string[],
    sourceLocale: string | null,
    targetLocale: string,
    format: TranslateFormat = 'text',
  ): Promise<string[]> {
    if (!contents.length) return [];
    const translate = this.config.translate;
    switch (translate.provider) {
      case 'none':
        throw new NotImplementedException('Machine translation is not configured (set DEEPL_API_KEY or GOOGLE_CLOUD_PROJECT)');
      case 'stub':
        return contents.map(content => this.stub(content, sourceLocale, targetLocale, format));
      case 'deepl': {
        this.checkLocales(sourceLocale, targetLocale, DEEPL_SOURCE_SUPPORT_LOCALES, DEEPL_TARGET_SUPPORT_LOCALES);
        if (!this.deepl) {
          const { Translator } = await import('deepl-node');
          this.deepl = new Translator(translate.apiKey);
        }
        try {
          const results = await this.deepl.translateText(
            contents,
            sourceLocale as never,
            targetLocale as never,
            deeplTranslateOptions(format),
          );
          return results.map(it => it.text);
        } catch {
          throw new ProviderError('DeepL Translation API is not configured properly.');
        }
      }
      case 'google': {
        this.checkLocales(sourceLocale, targetLocale, GCP_SOURCE_SUPPORT_LOCALES, GCP_TARGET_SUPPORT_LOCALES);
        if (!this.google) {
          const { TranslationServiceClient } = await import('@google-cloud/translate');
          this.google = new TranslationServiceClient();
        }
        try {
          const [response] = await this.google.translateText({
            parent: `projects/${translate.projectId}/locations/${translate.location}`,
            contents,
            mimeType: googleMimeType(format),
            sourceLanguageCode: sourceLocale ?? undefined,
            targetLanguageCode: targetLocale,
          });
          return (response.translations ?? []).map(it => it.translatedText || '');
        } catch {
          throw new ProviderError(`Cloud Translation API has not been used in project ${translate.projectId} before or it is disabled`);
        }
      }
    }
  }

  async translate(content: string, sourceLocale: string | null, targetLocale: string, format: TranslateFormat = 'text'): Promise<string> {
    return (await this.translateBatch([content], sourceLocale, targetLocale, format))[0] ?? '';
  }

  /** Grouped by format, chunked to the provider cap; a failing chunk only fails its own items. */
  translateItems(items: TranslateItem[], sourceLocale: string, targetLocale: string): Promise<TranslateBatchResult> {
    if (!this.enabled)
      throw new NotImplementedException('Machine translation is not configured (set DEEPL_API_KEY or GOOGLE_CLOUD_PROJECT)');
    return translateItems(items, sourceLocale, targetLocale, (contents, source, target, format) =>
      this.translateBatch(contents, source, target, format),
    );
  }
}
