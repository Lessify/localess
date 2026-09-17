import { COUNTRY_FLAGS, IDENTICAL_FLAG_LOCALES, LANGUAGE_FLAGS } from './locale-flags';

/** One side of the icon: a flag image, or the language code when no flag exists for it. */
export interface LocaleIconHalf {
  flag?: string;
  code?: string;
}

/** A full circle (`end` absent) or a circle split between a language and a region. */
export interface LocaleIcon {
  start: LocaleIconHalf;
  end?: LocaleIconHalf;
}

const FLAG_BASE = 'assets/flags';

/**
 * UN M49 macro-regions: `ar-001` is "Arabic (World)", `es-419` "Spanish (Latin America)". No
 * country flag can stand for either, so both get the UN flag - the one globe the set ships as a
 * real file. (`earth.svg` exists in the repository but only as a symlink, which npm does not
 * materialise on install.)
 */
const MACRO_REGION_FLAG = `${FLAG_BASE}/un.svg`;
const MACRO_REGIONS = new Set(['001', '419']);

/**
 * The icon for a locale id, as a language half and an optional region half.
 *
 * A locale id says what it says and no more, so the icon claims no more either:
 *
 * - `de-CH`, `it-CH` - both halves known and different pictures: a split circle. This is the case
 *   the component exists for, since "German (Switzerland)" and "Italian (Switzerland)" otherwise
 *   show the same flag.
 * - `de-DE`, `en-GB` - both halves known but the *same* picture, because circle-flags' language
 *   flags are national flags under another name: one flag, since two identical halves only look
 *   like a rendering bug. Which locales those are is measured by the generator rather than guessed
 *   - see `IDENTICAL_FLAG_LOCALES`.
 * - `agq-CM` - region flag only: Cameroon's flag alone. `ksf-CM` gets the same icon; the locale
 *   name beside it is what tells them apart.
 * - `de`, `ar`, `zh-Hans` - language flag only: one flag, no region to add.
 * - `asa`, `bez` - neither: the language code as text.
 *
 * Scripts are invisible here: `zh-Hans` and `zh-Hant` resolve to the same flag. Flags cannot
 * express a writing system, which is part of why the icon is never shown without its label.
 */
export function localeIcon(localeId: string): LocaleIcon {
  const { language, region } = subtagsOf(localeId);

  const languageFlag = LANGUAGE_FLAGS.has(language) ? `${FLAG_BASE}/language/${language}.svg` : undefined;
  const regionFlag = regionFlagOf(region);

  if (languageFlag !== undefined && regionFlag !== undefined && !IDENTICAL_FLAG_LOCALES.has(localeId)) {
    return { start: { flag: languageFlag }, end: { flag: regionFlag } };
  }
  const single = languageFlag ?? regionFlag;
  return single === undefined ? { start: { code: languageCode(language) } } : { start: { flag: single } };
}

function regionFlagOf(region: string | undefined): string | undefined {
  if (region === undefined) {
    return undefined;
  }
  if (MACRO_REGIONS.has(region)) {
    return MACRO_REGION_FLAG;
  }
  return COUNTRY_FLAGS.has(region) ? `${FLAG_BASE}/${region}.svg` : undefined;
}

/**
 * Splits a locale id into its language and region subtags.
 *
 * `Intl.Locale` is used rather than a split on `-` because it reads scripts correctly
 * (`shi-Latn-MA` is region `MA`, not `Latn`) and, crucially, does *not* infer: `en` has no region
 * and stays that way. `maximize()` would invent one - `en` becomes `en-Latn-US` - which is exactly
 * the wrong answer for a content locale.
 */
function subtagsOf(localeId: string): { language: string; region?: string } {
  try {
    const { language, region } = new Intl.Locale(localeId);
    return { language, region: region?.toLowerCase() };
  } catch {
    // An id the tag parser rejects still has to render something.
    return { language: localeId.toLowerCase() };
  }
}

/** Language subtags run 2-3 letters; anything longer is truncated so it stays inside the circle. */
function languageCode(language: string): string {
  return language.slice(0, 3).toUpperCase();
}
