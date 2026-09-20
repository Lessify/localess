import { TestBed } from '@angular/core/testing';
import { Locale } from '@shared/models/locale.model';
import { LocaleStatus, Translation, TranslationStatus, TranslationType } from '@shared/models/translation.model';
import { vi } from 'vitest';

import { TranslationListComponent } from './translation-list.component';

const en: Locale = { id: 'en', name: 'English' };
const de: Locale = { id: 'de', name: 'German' };

function translation(overrides: Partial<Translation> = {}): Translation {
  return { id: 't1', type: TranslationType.STRING, locales: { en: 'Hello' }, ...overrides } as Translation;
}

describe('TranslationListComponent', () => {
  function setup(translations: Translation[] = [], availableLocales: Locale[] = [en, de]) {
    TestBed.overrideComponent(TranslationListComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(TranslationListComponent);
    fixture.componentRef.setInput('translations', translations);
    fixture.componentRef.setInput('availableLocales', availableLocales);
    fixture.detectChanges();
    return { component: fixture.componentInstance, fixture };
  }

  it('emits translationSelect when a translation is selected', () => {
    const { component } = setup();
    const t = translation({ id: 't1' });
    const spy = vi.fn();
    component.translationSelect.subscribe(spy);

    component.translationSelect.emit(t);

    expect(spy).toHaveBeenCalledWith(t);
  });

  describe('filterTranslations', () => {
    it('returns all items when no filter is active', () => {
      const { component } = setup();
      const items = [translation({ id: 'a' }), translation({ id: 'b' })];

      expect(component.filterTranslations(items, 'en', '', [], [], [])).toEqual(items);
    });

    it('filters by id substring match', () => {
      const { component } = setup();
      const items = [translation({ id: 'home.title' }), translation({ id: 'footer.text' })];

      const result = component.filterTranslations(items, 'en', 'home', [], [], []);

      expect(result).toEqual([items[0]]);
    });

    it('falls back to matching the locale value when the id does not match', () => {
      const { component } = setup();
      const items = [translation({ id: 'home.title', locales: { en: 'Welcome home' } })];

      const result = component.filterTranslations(items, 'en', 'welcome', [], [], []);

      expect(result).toEqual(items);
    });

    it('filters by label', () => {
      const { component } = setup();
      const items = [translation({ id: 'a', labels: ['ui'] }), translation({ id: 'b', labels: ['marketing'] })];

      const result = component.filterTranslations(items, 'en', '', ['ui'], [], []);

      expect(result).toEqual([items[0]]);
    });

    it('filters by translation status', () => {
      const { component } = setup();
      const translated = translation({ id: 'a', locales: { en: 'Hi', de: 'Hallo' } });
      const untranslated = translation({ id: 'b', locales: {} });

      const result = component.filterTranslations(
        [translated, untranslated],
        'en',
        '',
        [],
        [TranslationStatus.UNTRANSLATED],
        [],
      );

      expect(result).toEqual([untranslated]);
    });

    it('filters by locale status', () => {
      const { component } = setup();
      const translatedInEn = translation({ id: 'a', locales: { en: 'Hi' } });
      const untranslatedInEn = translation({ id: 'b', locales: { en: '' } });

      const result = component.filterTranslations([translatedInEn, untranslatedInEn], 'en', '', [], [], [LocaleStatus.TRANSLATED]);

      expect(result).toEqual([translatedInEn]);
    });
  });

  describe('buildTranslationTree', () => {
    it('groups dotted ids into a nested tree', () => {
      const { component } = setup();
      const items = [translation({ id: 'home.title' }), translation({ id: 'home.subtitle' }), translation({ id: 'footer' })];

      const tree = component.buildTranslationTree(items);

      expect(tree).toEqual([
        { name: 'home', key: 'home', children: [{ name: 'title', key: 'home.title' }, { name: 'subtitle', key: 'home.subtitle' }] },
        { name: 'footer', key: 'footer' },
      ]);
    });
  });

  describe('translationsFiltered / translationTreeFiltered', () => {
    it('applies the filterCriteria input to build the filtered list and tree', () => {
      const { component, fixture } = setup([translation({ id: 'home.title' }), translation({ id: 'footer' })]);

      fixture.componentRef.setInput('filterCriteria', { locale: 'en', search: 'home', labels: [], states: [] });
      fixture.detectChanges();

      expect(component.translationsFiltered().map(it => it.id)).toEqual(['home.title']);
      expect(component.translationTreeFiltered()).toEqual([{ name: 'home', key: 'home', children: [{ name: 'title', key: 'home.title' }] }]);
    });
  });

  describe('identifyTranslationStatus / identifyLocaleStatus', () => {
    it('is UNTRANSLATED when there are no locale values at all', () => {
      const { component } = setup();

      expect(component.identifyTranslationStatus(translation({ locales: {} }))).toBe(TranslationStatus.UNTRANSLATED);
    });

    it('is TRANSLATED when every available locale has a value', () => {
      const { component } = setup();

      expect(component.identifyTranslationStatus(translation({ locales: { en: 'Hi', de: 'Hallo' } }))).toBe(TranslationStatus.TRANSLATED);
    });

    it('identifyLocaleStatus treats an empty/whitespace value as untranslated', () => {
      const { component } = setup();

      expect(component.identifyLocaleStatus(translation({ locales: { en: '  ' } }), 'en')).toBe(LocaleStatus.UNTRANSLATED);
      expect(component.identifyLocaleStatus(translation({ locales: { en: 'Hi' } }), 'en')).toBe(LocaleStatus.TRANSLATED);
    });
  });

  describe('tree expansion', () => {
    const items = [translation({ id: 'home.title' }), translation({ id: 'home.nav.back' }), translation({ id: 'footer' })];

    it('starts with nothing expanded', () => {
      const { component } = setup(items);

      expect(component.expandedKeys()).toEqual(new Set());
    });

    it('remembers manual expansion while no filter is active', () => {
      const { component } = setup(items);

      component.onExpandedKeysChange(new Set(['home']));

      expect(component.expandedKeys()).toEqual(new Set(['home']));
    });

    it('expands every group when a filter becomes active', () => {
      const { component, fixture } = setup(items);

      fixture.componentRef.setInput('filterCriteria', { locale: 'en', search: 'home', labels: [], states: [] });
      fixture.detectChanges();

      expect(component.expandedKeys()).toEqual(new Set(['home', 'home.nav']));
    });

    it('restores the manual expansion state when the filter clears', () => {
      const { component, fixture } = setup(items);
      component.onExpandedKeysChange(new Set(['home']));

      fixture.componentRef.setInput('filterCriteria', { locale: 'en', search: 'home', labels: [], states: [] });
      fixture.detectChanges();
      fixture.componentRef.setInput('filterCriteria', { locale: 'en', search: '', labels: [], states: [] });
      fixture.detectChanges();

      expect(component.expandedKeys()).toEqual(new Set(['home']));
    });

    it('allows collapsing a group while a filter is active', () => {
      const { component, fixture } = setup(items);
      fixture.componentRef.setInput('filterCriteria', { locale: 'en', search: 'home', labels: [], states: [] });
      fixture.detectChanges();

      component.onExpandedKeysChange(new Set(['home']));

      expect(component.expandedKeys()).toEqual(new Set(['home']));
    });
  });
});
