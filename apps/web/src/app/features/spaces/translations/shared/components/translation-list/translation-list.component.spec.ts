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

const keys = (count: number) => Array.from({ length: count }, (_, i) => translation(`key${String(i).padStart(3, '0')}`));

describe('TranslationListComponent', () => {
  async function setup(items: Translation[] = []) {
    const events = new Subject<ChangeEvent>();
    const findPage = vi.fn((_spaceId: string, params: HttpParams) => {
      const page = Number(params.get('page'));
      const size = Number(params.get('size'));
      return of<Page<Translation>>({ items: items.slice(page * size, (page + 1) * size), page, size, total: items.length });
    });
    localStorage.clear();
    TestBed.overrideComponent(TranslationListComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: TranslationService, useValue: { findPage, findNodes: vi.fn() } },
        { provide: ChangeEventsService, useValue: { changes: () => events } },
        { provide: NotificationService, useValue: { error: vi.fn() } },
      ],
    });
    TestBed.inject(LocalSettingsStore).setTranslationLayout('list');
    const fixture = TestBed.createComponent(TranslationListComponent);
    fixture.componentRef.setInput('spaceId', 'space-1');
    fixture.componentRef.setInput('availableLocales', [en, de]);
    fixture.componentRef.setInput('currentLocale', 'en');
    fixture.detectChanges();
    await fixture.whenStable();
    return { component: fixture.componentInstance, fixture, findPage, events };
  }

  /** The pages read so far. */
  const pagesRead = (findPage: Awaited<ReturnType<typeof setup>>['findPage']) => findPage.mock.calls.map(it => it[1].get('page'));

  it('reads the first 50 keys with the locale; the rows end with the marker while there are more', async () => {
    const { component, findPage } = await setup(keys(120));

    expect(findPage.mock.calls.at(-1)?.[1].toString()).toBe('page=0&size=50&locale=en');
    expect(component.listRows()).toHaveLength(51);
    expect(component.listRows().at(-1)).toEqual({ kind: 'end' });
    expect(component.pages.total()).toBe(120);
  });

  it('loads the next keys when the marker is rendered and on screen, until every key is shown', async () => {
    const { component, fixture, findPage } = await setup(keys(120));

    // On screen, but not rendered by the virtual list (an old report): nothing.
    component.onListEndInView(true);
    await fixture.whenStable();
    expect(pagesRead(findPage)).toEqual(['0']);

    for (let i = 0; i < 3; i++) {
      component.onListRendered(component.listRows().length);
      await fixture.whenStable();
    }

    expect(pagesRead(findPage)).toEqual(['0', '1', '2']);
    expect(component.listRows()).toHaveLength(120);
    expect(component.listRows().some(row => row.kind === 'end')).toBe(false);
  });

  it('sends the filter as the server names it, and starts again from the first keys', async () => {
    const { component, fixture, findPage } = await setup(keys(120));
    component.onListEndInView(true);
    component.onListRendered(component.listRows().length);
    await fixture.whenStable();

    fixture.componentRef.setInput('filterCriteria', {
      locale: 'en',
      search: 'home',
      labels: ['ui'],
      states: [TranslationStatus.PARTIALLY_TRANSLATED, LocaleStatus.UNTRANSLATED],
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(findPage.mock.calls.at(-1)?.[1].toString()).toBe(
      'page=0&size=50&locale=en&search=home&label=ui&status=PARTIALLY_TRANSLATED&localeStatus=UNTRANSLATED',
    );
    expect(component.isFiltering()).toBe(true);
  });

  it('reads again every page loaded after a change', async () => {
    const { component, fixture, findPage, events } = await setup(keys(120));
    component.onListEndInView(true);
    component.onListRendered(component.listRows().length);
    await fixture.whenStable();
    findPage.mockClear();
    vi.useFakeTimers();

    events.next({ spaceId: 'space-1', entity: 'translations', id: 'x', op: 'updated' });
    await vi.advanceTimersByTimeAsync(300);

    expect(pagesRead(findPage)).toEqual(['0', '1']);
    expect(component.pages.items()).toHaveLength(100);
    vi.useRealTimers();
  });

  it('emits the first key read, and the selection by key', async () => {
    const first = translation('home.title');
    const { component } = await setup([first]);
    const selectSpy = vi.fn();
    component.translationSelect.subscribe(selectSpy);

    component.onListSelect(first);

    expect(selectSpy).toHaveBeenCalledWith(first);
    expect(component.selectedKey()).toBe('home.title');
  });

  it('identifies the translation status over the available locales', async () => {
    const { component } = await setup();

    expect(component.identifyTranslationStatus(translation('a', {}))).toBe(TranslationStatus.UNTRANSLATED);
    expect(component.identifyTranslationStatus(translation('a', { en: 'Hi' }))).toBe(TranslationStatus.PARTIALLY_TRANSLATED);
    expect(component.identifyTranslationStatus(translation('a', { en: 'Hi', de: 'Hallo' }))).toBe(TranslationStatus.TRANSLATED);
  });
});
