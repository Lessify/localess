/**
 * What the "Translations (large)" template (`TRANSLATIONS_LARGE`, a test template) holds, written from its rule in
 * docs/superpowers/plans/2026-10-17-space-templates.md, not imported from the server: a generator bug must fail a test,
 * not move its expectation along.
 *
 * Keys `section{SS}.page{PP}.{field}` (sections 01–20, pages 01–50, the 10 fields), values
 * `{Field} of section {s}, page {p} ({locale})`; labels by section (`marketing`, `checkout`, `account`, `legal`) plus
 * `cta` on `button` keys; page 50 has no French value; page 49 `hint` has no value at all. Nothing is published.
 */
export const LARGE = {
  template: 'TRANSLATIONS_LARGE',
  locales: { en: 'English', de: 'German', fr: 'French' },
  keys: 10_000,
  sections: 20,
  pages: 50,
  fields: ['title', 'subtitle', 'body', 'button', 'link', 'caption', 'hint', 'label', 'alt', 'footer'],
  translated: 9_780,
  partlyTranslated: 200,
  untranslated: 20,
} as const;

const pad = (n: number) => String(n).padStart(2, '0');

export function largeKey(section: number, page: number, field: string): string {
  return `section${pad(section)}.page${pad(page)}.${field}`;
}

export function largeValue(section: number, page: number, field: string, locale: string): string {
  return `${field[0].toUpperCase()}${field.slice(1)} of section ${section}, page ${page} (${locale})`;
}

/** The 10 keys of one page, in field order. */
export function largePageKeys(section: number, page: number): string[] {
  return LARGE.fields.map(field => largeKey(section, page, field));
}
