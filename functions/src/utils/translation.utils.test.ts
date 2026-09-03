import { describe, expect, it } from 'vitest';
import { Translation, TranslationType } from '../models';
import { planTranslationUpdate } from './translation.utils';

const timestamps = { createdAt: {} as never, updatedAt: {} as never };

function translation(locales: Record<string, string>): Translation {
  return { type: TranslationType.STRING, locales, ...timestamps };
}

describe('planTranslationUpdate', () => {
  it('classifies a key absent from Firestore as a create', () => {
    const existing = new Map<string, Translation>();
    const plan = planTranslationUpdate(existing, 'en', { 'nav.home': 'Home' });
    expect(plan).toEqual({ creates: ['nav.home'], updates: [], deletes: [], unchanged: [] });
  });

  it('classifies a key with a different value for this locale as an update', () => {
    const existing = new Map([['nav.home', translation({ en: 'Old value' })]]);
    const plan = planTranslationUpdate(existing, 'en', { 'nav.home': 'New value' });
    expect(plan).toEqual({ creates: [], updates: ['nav.home'], deletes: [], unchanged: [] });
  });

  it('classifies a key with an identical value for this locale as unchanged (no write)', () => {
    const existing = new Map([['nav.home', translation({ en: 'Home' })]]);
    const plan = planTranslationUpdate(existing, 'en', { 'nav.home': 'Home' });
    expect(plan).toEqual({ creates: [], updates: [], deletes: [], unchanged: ['nav.home'] });
  });

  it('classifies a key missing this locale (but existing for another) as an update, not unchanged', () => {
    const existing = new Map([['nav.home', translation({ de: 'Startseite' })]]);
    const plan = planTranslationUpdate(existing, 'en', { 'nav.home': 'Home' });
    expect(plan).toEqual({ creates: [], updates: ['nav.home'], deletes: [], unchanged: [] });
  });

  it('classifies a Firestore-only key absent from values as a delete', () => {
    const existing = new Map([['nav.old', translation({ en: 'Old page' })]]);
    const plan = planTranslationUpdate(existing, 'en', {});
    expect(plan).toEqual({ creates: [], updates: [], deletes: ['nav.old'], unchanged: [] });
  });

  it('never reports deletes when existing is scoped to only the requested ids (targeted-read strategy)', () => {
    // Simulates the add-missing/update-existing fetch strategy: `existing` only ever contains
    // docs for ids present in `values`, so there is nothing for `deletes` to find — by construction,
    // not a special case in the function itself.
    const existing = new Map([['nav.home', translation({ en: 'Home' })]]);
    const plan = planTranslationUpdate(existing, 'en', { 'nav.home': 'Home', 'nav.about': 'About' });
    expect(plan.deletes).toEqual([]);
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
      deletes: ['nav.old'],
      unchanged: ['nav.home'],
    });
  });

  it('returns an empty plan for empty existing and values', () => {
    const plan = planTranslationUpdate(new Map(), 'en', {});
    expect(plan).toEqual({ creates: [], updates: [], deletes: [], unchanged: [] });
  });
});
