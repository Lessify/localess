import { Locale } from '@shared/models/locale.model';
import { LocaleStatus, Translation, TranslationStatus, TranslationType } from '@shared/models/translation.model';

import { identifyLocaleStatus, identifyTranslationStatus } from './translation.model';

const en: Locale = { id: 'en', name: 'English' };
const de: Locale = { id: 'de', name: 'German' };

function translation(overrides: Partial<Translation> = {}): Translation {
  return { id: 't1', type: TranslationType.STRING, locales: { en: 'Hello' }, ...overrides } as Translation;
}

describe('identifyTranslationStatus', () => {
  it('is UNTRANSLATED when there are no locale values at all', () => {
    expect(identifyTranslationStatus(translation({ locales: {} }), [en, de])).toBe(TranslationStatus.UNTRANSLATED);
  });

  it('is TRANSLATED when every given locale has a value', () => {
    expect(identifyTranslationStatus(translation({ locales: { en: 'Hi', de: 'Hallo' } }), [en, de])).toBe(TranslationStatus.TRANSLATED);
  });

  it('is PARTIALLY_TRANSLATED when only some given locales have a value', () => {
    expect(identifyTranslationStatus(translation({ locales: { en: 'Hi' } }), [en, de])).toBe(TranslationStatus.PARTIALLY_TRANSLATED);
  });

  it('is UNTRANSLATED when none of the given locales have a value', () => {
    expect(identifyTranslationStatus(translation({ locales: { fr: 'Bonjour' } }), [en, de])).toBe(TranslationStatus.UNTRANSLATED);
  });
});

describe('identifyLocaleStatus', () => {
  it('treats a missing value as untranslated', () => {
    expect(identifyLocaleStatus(translation({ locales: {} }), 'en')).toBe(LocaleStatus.UNTRANSLATED);
  });

  it('treats an empty/whitespace value as untranslated', () => {
    expect(identifyLocaleStatus(translation({ locales: { en: '  ' } }), 'en')).toBe(LocaleStatus.UNTRANSLATED);
  });

  it('treats a non-empty value as translated', () => {
    expect(identifyLocaleStatus(translation({ locales: { en: 'Hi' } }), 'en')).toBe(LocaleStatus.TRANSLATED);
  });
});
