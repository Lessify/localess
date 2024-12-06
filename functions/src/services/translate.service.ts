import {
  DEEPL_SOURCE_SUPPORT_LOCALES,
  DEEPL_TARGET_SUPPORT_LOCALES,
  firebaseConfig,
  GCP_SUPPORT_LOCALES,
  remoteConfigTemplate,
  translationService,
} from '../config';
import { HttpsError } from 'firebase-functions/v2/https';
import { TargetLanguageCode, Translator } from 'deepl-node';
import { SourceLanguageCode } from 'deepl-node/dist/types';
import { logger } from 'firebase-functions/v2';
import { protos } from '@google-cloud/translate';

/**
 * Translate content
 * @param {string} content
 * @param {string | null} sourceLocale
 * @param {string} targetLocale
 */
export async function translateCloud(content: string, sourceLocale: string | null, targetLocale: string): Promise<string> {
  let deeplApiKey: string | undefined = undefined;
  // Get Server Configurations
  try {
    await remoteConfigTemplate.load();
    const config = remoteConfigTemplate.evaluate();
    deeplApiKey = config.getString('deepl_api_key');
  } catch (e) {
    logger.warn(e);
  }

  if (deeplApiKey) {
    // DeepL Translate
    if (sourceLocale && !DEEPL_SOURCE_SUPPORT_LOCALES.has(sourceLocale)) {
      throw new HttpsError('invalid-argument', `Unsupported source locale : '${sourceLocale}'`);
    }
    if (!DEEPL_TARGET_SUPPORT_LOCALES.has(targetLocale)) {
      throw new HttpsError('invalid-argument', `Unsupported target locale : '${targetLocale}'`);
    }
    const translator = new Translator(deeplApiKey);
    try {
      const result = await translator.translateText(content, sourceLocale as SourceLanguageCode | null, targetLocale as TargetLanguageCode);
      return result.text;
    } catch (e) {
      logger.error(e);
      throw new HttpsError('failed-precondition', 'DeepL Translation API is not configured properly.');
    }
  } else {
    // Google Translate
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
      mimeType: 'text/plain',
      sourceLanguageCode: sourceLocale,
      targetLanguageCode: targetLocale,
    };
    try {
      const [responseTranslateText] = await translationService.translateText(tRequest);
      if (responseTranslateText.translations && responseTranslateText.translations.length > 0) {
        return responseTranslateText.translations[0].translatedText || '';
      } else {
        return '';
      }
    } catch (e) {
      logger.error(e);
      throw new HttpsError(
        'failed-precondition',
        `Cloud Translation API has not been used in project ${projectId} before or it is disabled`
      );
    }
  }
}
