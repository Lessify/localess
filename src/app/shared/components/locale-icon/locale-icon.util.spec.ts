import { localeIcon } from './locale-icon.util';

/**
 * These assert the *rule*, not the artwork: a locale gets a split circle only when its id names
 * both a language and a region and the two flags are different pictures. The flag files themselves
 * are guarded by `scripts/generate-locale-flags.test.mjs`, which can read the package - this test
 * build cannot touch the filesystem.
 */
describe('localeIcon()', () => {
  // The reason the component exists: same country, two languages, previously the same icon.
  it('splits a language/region locale between the two flags', () => {
    expect(localeIcon('de-CH')).toEqual({
      start: { flag: 'assets/flags/language/de.svg' },
      end: { flag: 'assets/flags/ch.svg' },
    });
    expect(localeIcon('it-CH')).toEqual({
      start: { flag: 'assets/flags/language/it.svg' },
      end: { flag: 'assets/flags/ch.svg' },
    });
  });

  // Two halves of the same picture read as a rendering bug, not as information.
  it('shows one flag when both halves would be identical', () => {
    expect(localeIcon('de-DE')).toEqual({ start: { flag: 'assets/flags/language/de.svg' } });
    // circle-flags uses the UK flag for English, so this collapses while `en-US` does not.
    expect(localeIcon('en-GB')).toEqual({ start: { flag: 'assets/flags/language/en.svg' } });
    expect(localeIcon('en-US')).toEqual({
      start: { flag: 'assets/flags/language/en.svg' },
      end: { flag: 'assets/flags/us.svg' },
    });
  });

  it('shows the language flag alone when the locale names no region', () => {
    expect(localeIcon('de')).toEqual({ start: { flag: 'assets/flags/language/de.svg' } });
    expect(localeIcon('ar')).toEqual({ start: { flag: 'assets/flags/language/ar.svg' } });
  });

  /**
   * A script cannot be drawn as a flag, so these two locales share an icon. Asserted rather than
   * left implicit: it is the known limitation behind keeping the locale name next to the icon.
   */
  it('ignores the script subtag', () => {
    expect(localeIcon('zh-Hans')).toEqual(localeIcon('zh-Hant'));
    expect(localeIcon('shi-Latn-MA')).toEqual({ start: { flag: 'assets/flags/ma.svg' } });
  });

  it('falls back to the region flag when the language has none', () => {
    expect(localeIcon('agq-CM')).toEqual({ start: { flag: 'assets/flags/cm.svg' } });
  });

  it('falls back to the language code when neither has a flag', () => {
    expect(localeIcon('asa')).toEqual({ start: { code: 'ASA' } });
    expect(localeIcon('bez')).toEqual({ start: { code: 'BEZ' } });
  });

  // `ar-001` is "Arabic (World)" and `es-419` "Spanish (Latin America)" - no country owns either.
  it('uses the UN flag for macro-regions', () => {
    expect(localeIcon('ar-001')).toEqual({
      start: { flag: 'assets/flags/language/ar.svg' },
      end: { flag: 'assets/flags/un.svg' },
    });
    expect(localeIcon('es-419')).toEqual({
      start: { flag: 'assets/flags/language/es.svg' },
      end: { flag: 'assets/flags/un.svg' },
    });
  });

  // Nothing should throw on an id the tag parser rejects, or on the content-side `default`
  // sentinel, even though neither is offered by the locale list.
  it('renders something for an unparseable id', () => {
    expect(localeIcon('not a locale')).toEqual({ start: { code: 'NOT' } });
    expect(localeIcon('default')).toEqual({ start: { code: 'DEF' } });
  });
});
