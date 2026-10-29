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
import { TranslationTreeRow } from '../../models/translation-tree';
import { firstShownKey, TranslationListComponent } from './translation-list.component';

const en: Locale = { id: 'en', name: 'English' };
const de: Locale = { id: 'de', name: 'German' };

function translation(key: string, locales: Record<string, string> = { en: 'Hello' }): Translation {
  return { id: `id-${key}`, key, locales } as Translation;
}

const keys = (count: number) => Array.from({ length: count }, (_, i) => translation(`key${String(i).padStart(3, '0')}`));

describe('TranslationListComponent', () => {
  async function setup(items: Translation[] = []) {
    const events = new Subject<ChangeEvent>();
    const findAll = vi.fn((_spaceId: string, params: HttpParams) => {
      const page = Number(params.get('page'));
      const size = Number(params.get('size'));
      return of<Page<Translation>>({ items: items.slice(page * size, (page + 1) * size), page, size, total: items.length });
    });
    localStorage.clear();
    TestBed.overrideComponent(TranslationListComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: TranslationService, useValue: { findAll, findNodes: vi.fn() } },
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
    return { component: fixture.componentInstance, fixture, findAll, events };
  }

  /** The pages read so far. */
  const pagesRead = (findAll: Awaited<ReturnType<typeof setup>>['findAll']) => findAll.mock.calls.map(it => it[1].get('page'));

  it('reads the first 50 keys with the locale; the rows end with the marker while there are more', async () => {
    const { component, findAll } = await setup(keys(120));

    expect(findAll.mock.calls.at(-1)?.[1].toString()).toBe('page=0&size=50&locale=en');
    expect(component.listRows()).toHaveLength(51);
    expect(component.listRows().at(-1)).toEqual({ kind: 'end' });
    expect(component.pages.total()).toBe(120);
  });

  it('loads the next keys when the marker is rendered and on screen, until every key is shown', async () => {
    const { component, fixture, findAll } = await setup(keys(120));

    // On screen, but not rendered by the virtual list (an old report): nothing.
    component.onListEndInView(true);
    await fixture.whenStable();
    expect(pagesRead(findAll)).toEqual(['0']);

    for (let i = 0; i < 3; i++) {
      component.onListRendered(component.listRows().length);
      await fixture.whenStable();
    }

    expect(pagesRead(findAll)).toEqual(['0', '1', '2']);
    expect(component.listRows()).toHaveLength(120);
    expect(component.listRows().some(row => row.kind === 'end')).toBe(false);
  });

  it('sends the filter as the server names it, and starts again from the first keys', async () => {
    const { component, fixture, findAll } = await setup(keys(120));
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

    expect(findAll.mock.calls.at(-1)?.[1].toString()).toBe(
      'page=0&size=50&locale=en&search=home&label=ui&status=PARTIALLY_TRANSLATED&localeStatus=UNTRANSLATED',
    );
    expect(component.isFiltering()).toBe(true);
  });

  it('reads again every page loaded after a change', async () => {
    const { component, fixture, findAll, events } = await setup(keys(120));
    component.onListEndInView(true);
    component.onListRendered(component.listRows().length);
    await fixture.whenStable();
    findAll.mockClear();
    vi.useFakeTimers();

    events.next({ spaceId: 'space-1', entity: 'translations', id: 'x', op: 'updated' });
    await vi.advanceTimersByTimeAsync(300);

    expect(pagesRead(findAll)).toEqual(['0', '1']);
    expect(component.pages.items()).toHaveLength(100);
    vi.useRealTimers();
  });

  it('emits the selection', async () => {
    const first = translation('home.title');
    const { component } = await setup([first]);
    const selectSpy = vi.fn();
    component.translationSelect.subscribe(selectSpy);

    component.onListSelect(first);

    expect(selectSpy).toHaveBeenCalledWith(first);
  });

  it('emits the first key shown, again when it changes', async () => {
    const items = keys(3);
    const { component, fixture, events } = await setup(items);
    const firstSpy = vi.fn();
    component.firstTranslation.subscribe(firstSpy);
    // Subscribed after the first load: the next change shows.
    items.shift();
    vi.useFakeTimers();
    events.next({ spaceId: 'space-1', entity: 'translations', id: 'x', op: 'deleted' });
    await vi.advanceTimersByTimeAsync(300);
    vi.useRealTimers();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(firstSpy).toHaveBeenLastCalledWith(items[0]);
  });

  describe('selected key and the filter', () => {
    async function outside(items: Translation[], filter: boolean) {
      const ctx = await setup(items);
      const outsideSpy = vi.fn();
      ctx.component.selectedOutsideFilter.subscribe(outsideSpy);
      if (filter) ctx.fixture.componentRef.setInput('filterCriteria', { locale: 'en', search: 'home', labels: [], states: [] });
      ctx.fixture.componentRef.setInput('selectedKey', 'about.title');
      ctx.fixture.detectChanges();
      await ctx.fixture.whenStable();
      return { ...ctx, outsideSpy };
    }

    it('asks the server for the key with the filter, one row', async () => {
      const { findAll, outsideSpy } = await outside([], true);

      expect(findAll.mock.calls.at(-1)?.[1].toString()).toBe('page=0&size=1&locale=en&search=home&key=about.title');
      expect(outsideSpy).toHaveBeenLastCalledWith(true);
    });

    it('is not outside when the server finds it', async () => {
      const { outsideSpy } = await outside([translation('about.title')], true);

      expect(outsideSpy).toHaveBeenLastCalledWith(false);
    });

    it('asks nothing when no filter narrows the keys', async () => {
      const { findAll, outsideSpy } = await outside([], false);

      expect(findAll.mock.calls.some(it => it[1].has('key'))).toBe(false);
      expect(outsideSpy).toHaveBeenLastCalledWith(false);
    });
  });

  it('identifies the translation status over the available locales', async () => {
    const { component } = await setup();

    expect(component.identifyTranslationStatus(translation('a', {}))).toBe(TranslationStatus.UNTRANSLATED);
    expect(component.identifyTranslationStatus(translation('a', { en: 'Hi' }))).toBe(TranslationStatus.PARTIALLY_TRANSLATED);
    expect(component.identifyTranslationStatus(translation('a', { en: 'Hi', de: 'Hallo' }))).toBe(TranslationStatus.TRANSLATED);
  });
});

describe('firstShownKey', () => {
  const node = (key: string, extra: Partial<TranslationTreeRow> = {}): TranslationTreeRow => ({
    key,
    name: key,
    kind: 'node',
    count: 1,
    ...extra,
  });

  it('skips the keys of a closed group', () => {
    const rows = [node('about', { children: [node('about.title', { translation: translation('about.title') })] }), node('home')];

    expect(firstShownKey(rows, new Set())).toBeUndefined();
  });

  it('finds the first key in an open group, or a group that is a key itself', () => {
    const title = translation('about.title');
    const rows = [node('about', { children: [node('about.title', { translation: title })] })];
    const both = translation('home');

    expect(firstShownKey(rows, new Set(['about']))).toBe(title);
    expect(firstShownKey([node('home', { translation: both, children: [] }), ...rows], new Set(['about']))).toBe(both);
  });
});
