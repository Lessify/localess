import { describe, expect, it } from 'vitest';
import { Translation, TranslationType } from '../models';
import { planTranslationUpdate, storedLocaleValues } from './translation.utils';

const timestamps = { createdAt: {} as never, updatedAt: {} as never };

function translation(locales: Record<string, string>): Translation {
  return { type: TranslationType.STRING, locales, ...timestamps };
}

describe('planTranslationUpdate', () => {
  it('classifies a key absent from Firestore as a create', () => {
    const existing = new Map<string, Translation>();
    const plan = planTranslationUpdate(existing, 'en', { 'nav.home': 'Home' });
    expect(plan).toEqual({ creates: ['nav.home'], updates: [], keyDeletes: [], valueDeletes: [], unchanged: [] });
  });

  it('classifies a key with a different value for this locale as an update', () => {
    const existing = new Map([['nav.home', translation({ en: 'Old value' })]]);
    const plan = planTranslationUpdate(existing, 'en', { 'nav.home': 'New value' });
    expect(plan).toEqual({ creates: [], updates: ['nav.home'], keyDeletes: [], valueDeletes: [], unchanged: [] });
  });

  it('classifies a key with an identical value for this locale as unchanged (no write)', () => {
    const existing = new Map([['nav.home', translation({ en: 'Home' })]]);
    const plan = planTranslationUpdate(existing, 'en', { 'nav.home': 'Home' });
    expect(plan).toEqual({ creates: [], updates: [], keyDeletes: [], valueDeletes: [], unchanged: ['nav.home'] });
  });

  it('classifies a key missing this locale (but existing for another) as an update, not unchanged', () => {
    const existing = new Map([['nav.home', translation({ de: 'Startseite' })]]);
    const plan = planTranslationUpdate(existing, 'en', { 'nav.home': 'Home' });
    expect(plan).toEqual({ creates: [], updates: ['nav.home'], keyDeletes: [], valueDeletes: [], unchanged: [] });
  });

  it('classifies a Firestore-only key absent from values as a key delete and, with a value here, a value delete', () => {
    const existing = new Map([['nav.old', translation({ en: 'Old page' })]]);
    const plan = planTranslationUpdate(existing, 'en', {});
    expect(plan).toEqual({ creates: [], updates: [], keyDeletes: ['nav.old'], valueDeletes: ['nav.old'], unchanged: [] });
  });

  // delete-missing-value only removes what this locale holds: a key the locale never had a value
  // for is still a key delete (for delete-missing-key), but has no value to remove.
  it('leaves keys without a value in this locale out of valueDeletes', () => {
    const existing = new Map([
      ['nav.translated', translation({ en: 'Hello', de: 'Hallo' })],
      ['nav.untranslated', translation({ en: 'New' })],
    ]);
    const plan = planTranslationUpdate(existing, 'de', {});
    expect(plan.keyDeletes).toEqual(['nav.translated', 'nav.untranslated']);
    expect(plan.valueDeletes).toEqual(['nav.translated']);
  });

  it('never reports deletes when existing is scoped to only the requested ids (targeted-read strategy)', () => {
    // Simulates the add-missing/update-existing fetch strategy: `existing` only ever contains
    // docs for ids present in `values`, so there is nothing for the deletes to find — by construction,
    // not a special case in the function itself.
    const existing = new Map([['nav.home', translation({ en: 'Home' })]]);
    const plan = planTranslationUpdate(existing, 'en', { 'nav.home': 'Home', 'nav.about': 'About' });
    expect(plan.keyDeletes).toEqual([]);
    expect(plan.valueDeletes).toEqual([]);
  });

  it('classifies a mixed payload correctly in one pass', () => {
    const existing = new Map([
      ['nav.home', translation({ en: 'Home' })],
      ['nav.about', translation({ en: 'Old about' })],
      ['nav.old', translation({ en: 'Old page' })],
    ]);
    const plan = planTranslationUpdate(existing, 'en', { 'nav.home': 'Home', 'nav.about': 'About Us', 'nav.contact': 'Contact' });
    expect(plan).toEqual({
      creates: ['nav.contact'],
      updates: ['nav.about'],
      keyDeletes: ['nav.old'],
      valueDeletes: ['nav.old'],
      unchanged: ['nav.home'],
    });
  });

  it('returns an empty plan for empty existing and values', () => {
    const plan = planTranslationUpdate(new Map(), 'en', {});
    expect(plan).toEqual({ creates: [], updates: [], keyDeletes: [], valueDeletes: [], unchanged: [] });
  });
});

describe('storedLocaleValues', () => {
  it('returns only the values stored for the locale, without falling back', () => {
    const translations = new Map([
      ['nav.home', translation({ en: 'Home', de: 'Startseite' })],
      ['nav.about', translation({ en: 'About' })],
      ['nav.blog', translation({ en: 'Blog', de: '' })],
    ]);

    expect(storedLocaleValues(translations, 'de')).toEqual({ 'nav.home': 'Startseite' });
    expect(storedLocaleValues(translations, 'en')).toEqual({ 'nav.home': 'Home', 'nav.about': 'About', 'nav.blog': 'Blog' });
  });

  it('keeps PLURAL and ARRAY values as their stored JSON strings', () => {
    const translations = new Map([['items', translation({ en: '{"0":"No items","1":"One item"}' })]]);

    expect(storedLocaleValues(translations, 'en')).toEqual({ items: '{"0":"No items","1":"One item"}' });
  });
});
