import { CONTENT_DEFAULT_LOCALE, toProviderLocale } from './locale.model';

describe('toProviderLocale', () => {
  // `default` is a storage sentinel, not a language. It stands for the space's fallback locale,
  // which is what the provider needs to be told.
  it('resolves the default sentinel to the space fallback', () => {
    expect(toProviderLocale(CONTENT_DEFAULT_LOCALE.id, 'en')).toBe('en');
  });

  it('leaves a real locale untouched', () => {
    expect(toProviderLocale('de', 'en')).toBe('de');
  });

  /**
   * A space always has a fallback locale, so an unresolved sentinel means the space is missing -
   * a bug, not a normal path. Returning the raw id lets the provider reject `default` and surface
   * that, rather than auto-detecting and quietly translating from whatever it guesses.
   */
  it('returns the raw id when the sentinel cannot be resolved', () => {
    expect(toProviderLocale(CONTENT_DEFAULT_LOCALE.id, undefined)).toBe(CONTENT_DEFAULT_LOCALE.id);
  });
});
