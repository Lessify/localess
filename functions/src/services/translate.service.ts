import {
  DEEPL_SOURCE_SUPPORT_LOCALES,
  DEEPL_TARGET_SUPPORT_LOCALES,
  firebaseConfig,
  GCP_SUPPORT_LOCALES,
  isEmulatorEnabled,
  getTranslationService,
  remoteConfigTemplate,
} from '../config';
import { HttpsError } from 'firebase-functions/v2/https';
import { TranslateFormat } from '../models';
import { deeplTranslateOptions, googleMimeType } from '../utils/translate-format.utils';
import type { TargetLanguageCode } from 'deepl-node';
import type { SourceLanguageCode } from 'deepl-node/dist/types';
import { logger } from 'firebase-functions/v2';
import type { protos } from '@google-cloud/translate';

/**
 * Translate content
 * @param {string} content
 * @param {string} sourceLocale
 * @param {string} targetLocale
 * @param {TranslateFormat} format `html` translates text nodes and passes markup through untouched
 */
export async function translateCloud(
  content: string,
  sourceLocale: string,
  targetLocale: string,
  format: TranslateFormat = 'text'
): Promise<string> {
  let deeplApiKey: string | undefined = undefined;
  if (isEmulatorEnabled) {
    // Read from local env
    deeplApiKey = process.env.DEEPL_API_KEY;
  } else {
    // Get Server Configurations
    try {
      await remoteConfigTemplate.load();
      const config = remoteConfigTemplate.evaluate();
      deeplApiKey = config.getString('deepl_api_key');
    } catch (error) {
      logger.warn(error);
    }
  }

  if (deeplApiKey) {
    // DeepL Translate
    if (sourceLocale && !DEEPL_SOURCE_SUPPORT_LOCALES.has(sourceLocale)) {
      throw new HttpsError('invalid-argument', `Unsupported source locale : '${sourceLocale}'`);
    }
    if (!DEEPL_TARGET_SUPPORT_LOCALES.has(targetLocale)) {
      throw new HttpsError('invalid-argument', `Unsupported target locale : '${targetLocale}'`);
    }
    const { Translator } = await import('deepl-node');
    const translator = new Translator(deeplApiKey);
    try {
      const result = await translator.translateText(
        content,
        sourceLocale as SourceLanguageCode,
        targetLocale as TargetLanguageCode,
        deeplTranslateOptions(format)
      );
      return result.text;
    } catch (e) {
      logger.error(e);
      throw new HttpsError('failed-precondition', 'DeepL Translation API is not configured properly.');
    }
  } else {
    // Google Translate
    return await translateWithGoogle(content, sourceLocale, targetLocale, format);
  }
}

/**
 * Translate content with Google Translate.
 *
 * Keeps a nullable source locale: `translations.ts` calls this directly for translation keys,
 * where null still means auto-detect. The content path resolves `default` to the space's fallback
 * before it gets here, so it always passes a real locale.
 * @param {string} content
 * @param {string | undefined | null} sourceLocale source locale, or null to auto-detect
 * @param {string} targetLocale
 * @param {TranslateFormat} format `html` translates text nodes and passes markup through untouched
 */
export async function translateWithGoogle(
  content: string,
  sourceLocale: string | undefined | null,
  targetLocale: string,
  format: TranslateFormat = 'text'
): Promise<string> {
  if (sourceLocale && !GCP_SUPPORT_LOCALES.has(sourceLocale)) {
    throw new HttpsError('invalid-argument', `Unsupported source locale : '${sourceLocale}'`);
  }
  if (!GCP_SUPPORT_LOCALES.has(targetLocale)) {
    throw new HttpsError('invalid-argument', `Unsupported target locale : '${targetLocale}'`);
  }

  const projectId = firebaseConfig.projectId;
  let locationId; // firebaseConfig.locationId || 'global'
  if (firebaseConfig.locationId && firebaseConfig.locationId.startsWith('us-')) {
    locationId = 'us-central1';
  } else {
    locationId = 'global';
  }

  const tRequest: protos.google.cloud.translation.v3.ITranslateTextRequest = {
    parent: `projects/${projectId}/locations/${locationId}`,
    contents: [content],
    mimeType: googleMimeType(format),
    sourceLanguageCode: sourceLocale,
    targetLanguageCode: targetLocale,
  };
  const translationService = await getTranslationService();
  try {
    const [responseTranslateText] = await translationService.translateText(tRequest);
    if (responseTranslateText.translations && responseTranslateText.translations.length > 0) {
      return responseTranslateText.translations[0].translatedText || '';
    } else {
      return '';
    }
  } catch (e) {
    logger.error(e);
    throw new HttpsError('failed-precondition', `Cloud Translation API has not been used in project ${projectId} before or it is disabled`);
  }
}

/**
 * Translate many strings in a single provider round-trip.
 *
 * Both providers accept an array, so a batch of N costs one request rather than N. Results
 * are returned in input order; callers rely on that to map them back to their ids.
 * @param {Array} contents strings to translate
 * @param {string} sourceLocale source locale
 * @param {string} targetLocale target locale
 * @param {TranslateFormat} format `html` translates text nodes and passes markup through
 * @return {Promise} translations, in input order
 */
export async function translateCloudBatch(
  contents: string[],
  sourceLocale: string,
  targetLocale: string,
  format: TranslateFormat = 'text'
): Promise<string[]> {
  if (contents.length === 0) return [];

  let deeplApiKey: string | undefined = undefined;
  if (isEmulatorEnabled) {
    deeplApiKey = process.env.DEEPL_API_KEY;
  } else {
    try {
      await remoteConfigTemplate.load();
      const config = remoteConfigTemplate.evaluate();
      deeplApiKey = config.getString('deepl_api_key');
    } catch (error) {
      logger.warn(error);
    }
  }

  if (deeplApiKey) {
    if (sourceLocale && !DEEPL_SOURCE_SUPPORT_LOCALES.has(sourceLocale)) {
      throw new HttpsError('invalid-argument', `Unsupported source locale : '${sourceLocale}'`);
    }
    if (!DEEPL_TARGET_SUPPORT_LOCALES.has(targetLocale)) {
      throw new HttpsError('invalid-argument', `Unsupported target locale : '${targetLocale}'`);
    }
    const { Translator } = await import('deepl-node');
    const translator = new Translator(deeplApiKey);
    try {
      const results = await translator.translateText(
        contents,
        sourceLocale as SourceLanguageCode,
        targetLocale as TargetLanguageCode,
        deeplTranslateOptions(format)
      );
      return results.map(it => it.text);
    } catch (e) {
      logger.error(e);
      throw new HttpsError('failed-precondition', 'DeepL Translation API is not configured properly.');
    }
  }

  if (sourceLocale && !GCP_SUPPORT_LOCALES.has(sourceLocale)) {
    throw new HttpsError('invalid-argument', `Unsupported source locale : '${sourceLocale}'`);
  }
  if (!GCP_SUPPORT_LOCALES.has(targetLocale)) {
    throw new HttpsError('invalid-argument', `Unsupported target locale : '${targetLocale}'`);
  }

  const projectId = firebaseConfig.projectId;
  const locationId = firebaseConfig.locationId && firebaseConfig.locationId.startsWith('us-') ? 'us-central1' : 'global';
  const tRequest: protos.google.cloud.translation.v3.ITranslateTextRequest = {
    parent: `projects/${projectId}/locations/${locationId}`,
    contents,
    mimeType: googleMimeType(format),
    sourceLanguageCode: sourceLocale,
    targetLanguageCode: targetLocale,
  };
  const translationService = await getTranslationService();
  try {
    const [response] = await translationService.translateText(tRequest);
    return (response.translations ?? []).map(it => it.translatedText || '');
  } catch (e) {
    logger.error(e);
    throw new HttpsError('failed-precondition', `Cloud Translation API has not been used in project ${projectId} before or it is disabled`);
  }
}
