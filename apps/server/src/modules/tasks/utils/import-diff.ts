import { Translation, TranslationExport } from '@localess/shared';
import { isLabelsEqual } from '../../../shared/utils/labels.utils.js';

/*
 * "Did the imported item change?" — moved unchanged from functions/src/services/translation.service.ts.
 * Imports only write items for which these return true.
 */

export function isLocalesEqual(a: Record<string, string>, b: Record<string, string>): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(k => a[k] === b[k]);
}

export function isTranslationChanged(existing: Translation, imported: TranslationExport): boolean {
  if (!isLocalesEqual(existing.locales, imported.locales)) return true;
  if ((existing.description ?? undefined) !== (imported.description ?? undefined)) return true;
  if (!isLabelsEqual(existing.labels, imported.labels)) return true;
  return false;
}
