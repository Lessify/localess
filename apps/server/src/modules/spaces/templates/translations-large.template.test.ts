import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { largeTranslations } from './translations-large.template.js';

const LOCALES = ['en', 'de', 'fr'];

/** The Translations page's rule (translation.model.ts `identifyTranslationStatus`). */
function status(locales: Record<string, string>): 'TRANSLATED' | 'PARTIALLY_TRANSLATED' | 'UNTRANSLATED' {
  const filled = LOCALES.filter(locale => locales[locale]).length;
  if (filled === LOCALES.length) return 'TRANSLATED';
  return filled === 0 ? 'UNTRANSLATED' : 'PARTIALLY_TRANSLATED';
}

describe('largeTranslations', () => {
  const all = largeTranslations();
  const byKey = new Map(all.map(it => [it.key, it]));

  it('generates 10,000 keys in order', () => {
    expect(all).toHaveLength(10_000);
    expect(all[0].key).toBe('section01.page01.title');
    expect(all[1].key).toBe('section01.page01.subtitle');
    expect(all[9999].key).toBe('section20.page50.footer');
    expect(byKey.size).toBe(10_000);
  });

  it('writes values that name their place and locale', () => {
    expect(byKey.get('section07.page12.title')).toEqual({
      key: 'section07.page12.title',
      locales: {
        en: 'Title of section 7, page 12 (en)',
        de: 'Title of section 7, page 12 (de)',
        fr: 'Title of section 7, page 12 (fr)',
      },
      labels: ['checkout'],
      description: 'Page 12 of section 7',
    });
    expect(byKey.get('section03.page04.button')).toEqual({
      key: 'section03.page04.button',
      locales: {
        en: 'Button of section 3, page 4 (en)',
        de: 'Button of section 3, page 4 (de)',
        fr: 'Button of section 3, page 4 (fr)',
      },
      labels: ['marketing', 'cta'],
    });
    expect(byKey.get('section20.page01.footer')?.labels).toEqual(['legal']);
    expect(byKey.get('section11.page01.alt')?.labels).toEqual(['account']);
  });

  it('leaves the fixed gaps', () => {
    expect(byKey.get('section01.page50.title')?.locales).toEqual({
      en: 'Title of section 1, page 50 (en)',
      de: 'Title of section 1, page 50 (de)',
    });
    expect(byKey.get('section05.page49.hint')?.locales).toEqual({});
    const counts = { TRANSLATED: 0, PARTIALLY_TRANSLATED: 0, UNTRANSLATED: 0 };
    for (const it of all) counts[status(it.locales)]++;
    expect(counts).toEqual({ TRANSLATED: 9_780, PARTIALLY_TRANSLATED: 200, UNTRANSLATED: 20 });
    expect(all.filter(it => it.labels?.includes('legal'))).toHaveLength(2_500);
    expect(all.filter(it => it.labels?.includes('cta'))).toHaveLength(1_000);
    expect(all.filter(it => it.description)).toHaveLength(1_000);
  });

  it('is stable', () => {
    expect(largeTranslations()).toEqual(all);
    expect(createHash('sha256').update(JSON.stringify(all)).digest('hex')).toBe(
      'f09def1a9a77dafa8e9b7ef099ad29de0ee53adfd74c235b6060831781f5b4ca',
    );
  });
});
