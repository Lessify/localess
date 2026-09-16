import { logger } from 'firebase-functions/v2';

import { TranslateBatchResult, TranslateFormat, TranslateItem } from '../models';
import { translateCloudBatch } from '../services/translate.service';
import { chunkBySize } from './chunk-by-size';

/** Google Cloud Translation caps a request at 30,000 code points; the margin covers the envelope. */
export const TRANSLATE_CHUNK_LIMIT = 27_000;

/**
 * Translate a batch of items, grouped by format and chunked to the provider's request cap.
 *
 * A failing chunk costs only its own items: the rest still return. An item that exceeds the
 * cap on its own cannot be sent and is reported rather than dropped, because silently losing
 * a field is worse than telling the author which one needs doing by hand.
 * @param {Array} items fields to translate
 * @param {string} sourceLocale source locale
 * @param {string} targetLocale target locale
 * @return {Promise} translations and per-item failures
 */
export async function translateItems(items: TranslateItem[], sourceLocale: string, targetLocale: string): Promise<TranslateBatchResult> {
  const result: TranslateBatchResult = { items: [], failed: [] };
  const byFormat = new Map<TranslateFormat, TranslateItem[]>();
  for (const item of items) {
    const format = item.format ?? 'text';
    byFormat.set(format, [...(byFormat.get(format) ?? []), item]);
  }

  for (const [format, group] of byFormat) {
    const { chunks, oversized } = chunkBySize(group, TRANSLATE_CHUNK_LIMIT, it => it.content.length);
    for (const item of oversized) {
      result.failed.push({
        id: item.id,
        reason: `Field is too large to translate (${item.content.length} of ${TRANSLATE_CHUNK_LIMIT} characters).`,
      });
    }
    for (const chunk of chunks) {
      try {
        const translated = await translateCloudBatch(
          chunk.map(it => it.content),
          sourceLocale,
          targetLocale,
          format
        );
        chunk.forEach((item, index) => result.items.push({ id: item.id, content: translated[index] ?? '' }));
      } catch (e) {
        const reason = e instanceof Error ? e.message : String(e);
        logger.error(`[translate] chunk of ${chunk.length} ${format} items failed: ${reason}`);
        chunk.forEach(item => result.failed.push({ id: item.id, reason }));
      }
    }
  }

  return result;
}
