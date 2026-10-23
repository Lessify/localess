import { isLabelsEqual } from '../../../shared/utils/labels.utils.js';

/*
 * "Did the imported item change?" Imports only write items for which this returns true.
 */

/** The columns of a translation an import compares: a row's, or a file line's. */
export interface TranslationValues {
  locales: Record<string, string>;
  description?: string | null;
  labels?: string[] | null;
}

export function isLocalesEqual(a: Record<string, string>, b: Record<string, string>): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(k => a[k] === b[k]);
}

/** No labels, or an empty list: none. */
const labelsOf = (values: TranslationValues): string[] | undefined => (values.labels?.length ? values.labels : undefined);

export function isTranslationChanged(existing: TranslationValues, imported: TranslationValues): boolean {
  if (!isLocalesEqual(existing.locales, imported.locales)) return true;
  if ((existing.description || undefined) !== (imported.description || undefined)) return true;
  if (!isLabelsEqual(labelsOf(existing), labelsOf(imported))) return true;
  return false;
}
