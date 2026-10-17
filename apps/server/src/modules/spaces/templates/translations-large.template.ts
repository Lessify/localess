import type { SpaceTemplate, TemplateTranslation } from './space-template.model.js';

const SECTIONS = 20;
const PAGES = 50;
const FIELDS = ['title', 'subtitle', 'body', 'button', 'link', 'caption', 'hint', 'label', 'alt', 'footer'] as const;
const LOCALES = ['en', 'de', 'fr'] as const;

const pad = (n: number) => String(n).padStart(2, '0');
const capitalise = (word: string) => word[0].toUpperCase() + word.slice(1);

function sectionLabel(section: number): string {
  if (section <= 5) return 'marketing';
  if (section <= 10) return 'checkout';
  if (section <= 15) return 'account';
  return 'legal';
}

/**
 * 10,000 translations by a fixed rule (no randomness, no clock: e2e tests compute what to expect from it):
 *
 * - keys `section{SS}.page{PP}.{field}`: sections 01–20 × pages 01–50 × the 10 FIELDS, in that nested order;
 * - values `{Field} of section {s}, page {p} ({locale})`, e.g. `Title of section 7, page 12 (de)`;
 * - labels by section (1–5 `marketing`, 6–10 `checkout`, 11–15 `account`, 16–20 `legal`), and `cta` on `button` keys;
 * - a description on `title` keys: `Page {p} of section {s}`;
 * - gaps: page 50 has no `fr` value (200 Partially Translated), page 49 `hint` has no value at all (20 Untranslated);
 *   the other 9,780 are Translated.
 */
export function largeTranslations(): TemplateTranslation[] {
  const result: TemplateTranslation[] = [];
  for (let section = 1; section <= SECTIONS; section++) {
    for (let page = 1; page <= PAGES; page++) {
      for (const field of FIELDS) {
        const locales: Record<string, string> = {};
        if (!(page === 49 && field === 'hint')) {
          for (const locale of LOCALES) {
            if (page === 50 && locale === 'fr') continue;
            locales[locale] = `${capitalise(field)} of section ${section}, page ${page} (${locale})`;
          }
        }
        const translation: TemplateTranslation = {
          key: `section${pad(section)}.page${pad(page)}.${field}`,
          locales,
          labels: field === 'button' ? [sectionLabel(section), 'cta'] : [sectionLabel(section)],
        };
        if (field === 'title') translation.description = `Page ${page} of section ${section}`;
        result.push(translation);
      }
    }
  }
  return result;
}

/** A space to test the Translations page and the CDN at scale. Test-only (LOCALESS_TEST_TEMPLATES). */
export const TRANSLATIONS_LARGE_TEMPLATE: SpaceTemplate = {
  id: 'TRANSLATIONS_LARGE',
  name: 'Translations (large)',
  description: '10,000 translated keys in English, German and French. For testing.',
  icon: 'lucideLanguages',
  test: true,
  locales: ['de', 'fr'],
  schemas: [],
  translations: largeTranslations,
};
