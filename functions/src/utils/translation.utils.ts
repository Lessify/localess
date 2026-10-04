import { Translation } from '../models';

/**
 * Result of planTranslationUpdate: the classified changes a translation update would apply.
 */
export interface TranslationUpdatePlan {
  /** Translation ids present in `values` but not yet in Firestore. */
  creates: string[];
  /** Translation ids present in both, with a different value for this locale. */
  updates: string[];
  /** Translation ids present in `existing` but absent from `values`. */
  deletes: string[];
  /** Translation ids present in both, with an identical value for this locale. */
  unchanged: string[];
}

/**
 * Compute the changes a translation update would apply, without touching Firestore.
 * Fetch-strategy agnostic: pass a full collection map to get `deletes` populated, or a map
 * scoped to only the ids in `values` (cheaper) when deletes aren't needed for this request.
 * @param {Map<string, Translation>} existing current translation documents keyed by id
 * @param {string} locale locale being pushed
 * @param {Record<string, string>} values pushed locale values keyed by translation id
 * @return {TranslationUpdatePlan} classified plan
 */
export function planTranslationUpdate(
  existing: Map<string, Translation>,
  locale: string,
  values: Record<string, string>
): TranslationUpdatePlan {
  const creates: string[] = [];
  const updates: string[] = [];
  const unchanged: string[] = [];
  for (const id of Object.getOwnPropertyNames(values)) {
    const orig = existing.get(id);
    if (!orig) creates.push(id);
    else if (orig.locales[locale] !== values[id]) updates.push(id);
    else unchanged.push(id);
  }
  const deletes: string[] = [];
  for (const id of existing.keys()) {
    if (values[id] === undefined) deletes.push(id);
  }
  return { creates, updates, deletes, unchanged };
}

/**
 * The values actually stored for one locale: keys with no value, or an empty one, are left out
 * rather than filled from the fallback locale the way published translation files are.
 * @param {Map<string, Translation>} translations translation documents keyed by id
 * @param {string} locale locale to read
 * @return {Record<string, string>} stored values keyed by translation id
 */
export function storedLocaleValues(translations: Map<string, Translation>, locale: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [id, translation] of translations) {
    const value = translation.locales[locale];
    if (value) values[id] = value;
  }
  return values;
}
