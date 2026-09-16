import { describe, expect, it } from 'vitest';
import { deeplTranslateOptions, googleMimeType } from './translate-format.utils';

describe('googleMimeType', () => {
  it('asks for html tag handling for an html payload', () => {
    expect(googleMimeType('html')).toBe('text/html');
  });

  it('sends plain text for a text payload', () => {
    expect(googleMimeType('text')).toBe('text/plain');
  });

  // MARKDOWN fields and translation keys pass no format, and markdown is text - a default of html
  // would make the provider treat `<` in ordinary copy as markup.
  it('defaults to plain text', () => {
    expect(googleMimeType()).toBe('text/plain');
    expect(googleMimeType(undefined)).toBe('text/plain');
  });
});

describe('deeplTranslateOptions', () => {
  it('turns on html tag handling for an html payload', () => {
    expect(deeplTranslateOptions('html')).toEqual({ tagHandling: 'html' });
  });

  // `undefined` rather than `{}`: it is passed straight through as DeepL's options argument, and
  // leaving its own defaults untouched is the intent for plain text.
  it('passes no options for a text payload', () => {
    expect(deeplTranslateOptions('text')).toBeUndefined();
  });

  it('defaults to passing no options', () => {
    expect(deeplTranslateOptions()).toBeUndefined();
  });
});
