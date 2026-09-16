import { TranslateFormat } from '../models';

/**
 * Maps a {@link TranslateFormat} onto each provider's tag-handling switch.
 *
 * In html mode both providers leave markup alone and translate only text nodes, which is what lets
 * a RICH_TEXT field be translated as HTML without losing its structure or marks. Getting either
 * mapping wrong still compiles and still returns a translation - it just quietly translates the
 * tags too - so the mapping lives here where it can be asserted.
 */

/**
 * Google Cloud Translation's `mimeType`.
 * @param {TranslateFormat} format Content format, defaults to `text`
 * @return {'text/html' | 'text/plain'} the mimeType to send with the request
 */
export function googleMimeType(format: TranslateFormat = 'text'): 'text/html' | 'text/plain' {
  return format === 'html' ? 'text/html' : 'text/plain';
}

/**
 * DeepL's `translateText` options, or `undefined` to leave its defaults alone.
 * @param {TranslateFormat} format Content format, defaults to `text`
 * @return {{ tagHandling: 'html' } | undefined} options to pass to `translateText`
 */
export function deeplTranslateOptions(format: TranslateFormat = 'text'): { tagHandling: 'html' } | undefined {
  return format === 'html' ? { tagHandling: 'html' } : undefined;
}
