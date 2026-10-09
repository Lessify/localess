import { describe, expect, it } from 'vitest';

import { PreviewUrlContext, resolvePreviewUrl, unknownPreviewUrlPlaceholders } from './preview-url';

const german: PreviewUrlContext = {
  documentId: 'doc-1',
  fullSlug: 'blog/hello',
  slug: 'hello',
  parentSlug: 'blog',
  localeId: 'de',
  fallbackLocaleId: 'en',
};
const defaultLocale: PreviewUrlContext = { ...german, localeId: 'default' };

describe('resolvePreviewUrl', () => {
  it('keeps the original convention for a URL without placeholders', () => {
    expect(resolvePreviewUrl('https://site.com/', german)).toBe('https://site.com/de/blog/hello');
    expect(resolvePreviewUrl('https://site.com/', defaultLocale)).toBe('https://site.com/blog/hello');
    expect(resolvePreviewUrl('https://site.com/api/draft?slug=', defaultLocale)).toBe('https://site.com/api/draft?slug=blog/hello');
  });

  it.each([
    ['https://site.com/blog/{slug}', 'https://site.com/blog/hello'],
    ['https://site.com/{fullSlug}?lang={locale}', 'https://site.com/blog/hello?lang=de'],
    ['https://{locale}.site.com/{fullSlug}', 'https://de.site.com/blog/hello'],
    ['https://site.com/api/draft?slug={fullSlug}&locale={locale}', 'https://site.com/api/draft?slug=blog/hello&locale=de'],
    ['https://site.com/{locale/}{fullSlug}/', 'https://site.com/de/blog/hello/'],
    ['https://site.com/{parentSlug}/preview/{documentId}', 'https://site.com/blog/preview/doc-1'],
  ])('fills %s', (url, expected) => {
    expect(resolvePreviewUrl(url, german)).toBe(expected);
  });

  it('uses the fallback locale for {locale} and nothing for {locale/} on the default locale', () => {
    expect(resolvePreviewUrl('https://site.com/{locale}/{fullSlug}', defaultLocale)).toBe('https://site.com/en/blog/hello');
    expect(resolvePreviewUrl('https://site.com/{locale/}{fullSlug}', defaultLocale)).toBe('https://site.com/blog/hello');
  });

  it('encodes values per path segment, so they cannot change the URL structure', () => {
    const odd = { ...german, fullSlug: 'a b/c?d', localeId: 'x/../y' };

    expect(resolvePreviewUrl('https://site.com/{fullSlug}?l={locale}', odd)).toBe('https://site.com/a%20b/c%3Fd?l=x%2F..%2Fy');
  });

  it('leaves unknown placeholders untouched', () => {
    expect(resolvePreviewUrl('https://site.com/{lang}/{slug}', german)).toBe('https://site.com/{lang}/hello');
  });
});

describe('unknownPreviewUrlPlaceholders', () => {
  it('lists placeholders that are not supported', () => {
    expect(unknownPreviewUrlPlaceholders('https://site.com/{lang}/{fullSlug}/{id}')).toEqual(['{lang}', '{id}']);
    expect(unknownPreviewUrlPlaceholders('https://site.com/{locale/}{fullSlug}')).toEqual([]);
  });
});
