import { HttpParams } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ChangeEvent, ChangeEventsService } from '@core/api/change-events.service';
import { NotificationService } from '@core/services/notification.service';
import { TranslationService } from '@core/services/translation.service';
import { LocalSettingsStore } from '@core/stores/local-settings.store';
import { Locale, Page, Translation } from '@localess/shared';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';

import { LocaleStatus, TranslationStatus } from '../../models/translation-status.model';
import { TranslationListComponent } from './translation-list.component';

const en: Locale = { id: 'en', name: 'English' };
const de: Locale = { id: 'de', name: 'German' };

function translation(key: string, locales: Record<string, string> = { en: 'Hello' }): Translation {
  return { id: `id-${key}`, key, locales } as Translation;
}

const page = (items: Translation[]): Page<Translation> => ({ items, page: 0, size: 50, total: items.length });

describe('TranslationListComponent', () => {
  function setup(items: Translation[] = []) {
    const findAll = vi.fn((_spaceId: string, _params: HttpParams) => of(page(items)));
    localStorage.clear();
    TestBed.overrideComponent(TranslationListComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: TranslationService, useValue: { findAll, findPage: vi.fn(), findNodes: vi.fn() } },
        { provide: ChangeEventsService, useValue: { changes: () => new Subject<ChangeEvent>() } },
        { provide: NotificationService, useValue: { error: vi.fn() } },
      ],
    });
    TestBed.inject(LocalSettingsStore).setTranslationLayout('list');
    const fixture = TestBed.createComponent(TranslationListComponent);
    fixture.componentRef.setInput('spaceId', 'space-1');
    fixture.componentRef.setInput('availableLocales', [en, de]);
    fixture.componentRef.setInput('currentLocale', 'en');
    fixture.detectChanges();
    return { component: fixture.componentInstance, fixture, findAll };
  }

  /** The query of the last list read, as `name=value` pairs. */
  const lastQuery = (findAll: ReturnType<typeof setup>['findAll']) => findAll.mock.calls.at(-1)?.[1].toString();

  it('reads the first page of the list, 50 keys, with the locale', () => {
    const { component, findAll } = setup([translation('home.title')]);

    expect(lastQuery(findAll)).toBe('page=0&size=50&locale=en');
    expect(component.listItems().map(it => it.key)).toEqual(['home.title']);
    expect(component.listTotal()).toBe(1);
  });

  it('sends the filter as the server names it, and starts again from the first page', () => {
    const { component, fixture, findAll } = setup();
    component.list.page.set(3);
    fixture.detectChanges();

    fixture.componentRef.setInput('filterCriteria', {
      locale: 'en',
      search: 'home',
      labels: ['ui'],
      states: [TranslationStatus.PARTIALLY_TRANSLATED, LocaleStatus.UNTRANSLATED],
    });
    fixture.detectChanges();

    expect(lastQuery(findAll)).toBe('page=0&size=50&locale=en&search=home&label=ui&status=PARTIALLY_TRANSLATED&localeStatus=UNTRANSLATED');
    expect(component.isFiltering()).toBe(true);
  });

  it('emits the first key of each page read, and the selection by key', () => {
    const first = translation('home.title');
    const { component, fixture } = setup([first]);
    const firstSpy = vi.fn();
    const selectSpy = vi.fn();
    component.firstTranslation.subscribe(firstSpy);
    component.translationSelect.subscribe(selectSpy);

    component.list.page.set(1);
    fixture.detectChanges();
    component.onListSelect(first);

    expect(firstSpy).toHaveBeenCalledWith(first);
    expect(selectSpy).toHaveBeenCalledWith(first);
    expect(component.selectedKey()).toBe('home.title');
  });

  it('identifies the translation status over the available locales', () => {
    const { component } = setup();

    expect(component.identifyTranslationStatus(translation('a', {}))).toBe(TranslationStatus.UNTRANSLATED);
    expect(component.identifyTranslationStatus(translation('a', { en: 'Hi' }))).toBe(TranslationStatus.PARTIALLY_TRANSLATED);
    expect(component.identifyTranslationStatus(translation('a', { en: 'Hi', de: 'Hallo' }))).toBe(TranslationStatus.TRANSLATED);
  });
});
