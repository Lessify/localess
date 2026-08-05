import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Locale } from '@shared/models/locale.model';
import { Space } from '@shared/models/space.model';
import { Token, TokenPermission } from '@shared/models/token.model';
import { LocaleStatus, Translation, TranslationStatus, TranslationType } from '@shared/models/translation.model';
import { LocaleService } from '@shared/services/locale.service';
import { NotificationService } from '@shared/services/notification.service';
import { PlatformService } from '@shared/services/platform.service';
import { TaskService } from '@shared/services/task.service';
import { TokenService } from '@shared/services/token.service';
import { TranslateService } from '@shared/services/translate.service';
import { TranslationService } from '@shared/services/translation.service';
import { SpaceStore } from '@shared/stores/space.store';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { TranslationsComponent } from './translations.component';

const en: Locale = { id: 'en', name: 'English' };
const de: Locale = { id: 'de', name: 'German' };

function space(overrides: Partial<Space> = {}): Space {
  return { id: 'space-1', name: 'Space 1', locales: [en, de], localeFallback: en, ...overrides } as Space;
}

function translation(overrides: Partial<Translation> = {}): Translation {
  return { id: 't1', type: TranslationType.STRING, locales: { en: 'Hello' }, ...overrides } as Translation;
}

describe('TranslationsComponent', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const NO_SPACE = null;

  function setup(translations: Translation[] = [], selectedSpace: Space | null = space(), isActionSave = false) {
    const resolvedSpace = selectedSpace === NO_SPACE ? undefined : selectedSpace;
    const findAll = vi.fn().mockReturnValue(of(translations));
    const create = vi.fn().mockReturnValue(of(undefined));
    const update = vi.fn().mockReturnValue(of(undefined));
    const updateId = vi.fn().mockReturnValue(of(undefined));
    const deleteTranslation = vi.fn().mockReturnValue(of(undefined));
    const publish = vi.fn().mockReturnValue(of(undefined));
    const updateLocale = vi.fn().mockReturnValue(of(undefined));
    const translateLocale = vi.fn().mockReturnValue(of(undefined));
    const isLocaleTranslatable = vi.fn().mockReturnValue(true);
    const createTranslationImportTask = vi.fn().mockReturnValue(of({ id: 'task1' }));
    const createTranslationExportTask = vi.fn().mockReturnValue(of({ id: 'task1' }));
    const translate = vi.fn().mockReturnValue(of('translated'));
    const findFirstByPermission = vi.fn().mockReturnValue(of([{ id: 'token1' } as Token]));
    const success = vi.fn();
    const error = vi.fn();
    const open = vi.fn();

    TestBed.overrideComponent(TranslationsComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        {
          provide: TranslationService,
          useValue: { findAll, create, update, updateId, delete: deleteTranslation, publish, updateLocale, translateLocale },
        },
        { provide: LocaleService, useValue: { isLocaleTranslatable } },
        { provide: TaskService, useValue: { createTranslationImportTask, createTranslationExportTask } },
        { provide: NotificationService, useValue: { success, error } },
        { provide: MatDialog, useValue: { open } },
        { provide: TranslateService, useValue: { translate } },
        { provide: TokenService, useValue: { findFirstByPermission } },
        { provide: PlatformService, useValue: { isActionSave: vi.fn().mockReturnValue(isActionSave) } },
        { provide: SpaceStore, useValue: { selectedSpace: signal(resolvedSpace) } },
      ],
    });
    const fixture = TestBed.createComponent(TranslationsComponent);
    fixture.componentRef.setInput('spaceId', 'space-1');
    fixture.detectChanges();
    return {
      component: fixture.componentInstance,
      findAll,
      create,
      update,
      updateId,
      deleteTranslation,
      publish,
      updateLocale,
      translateLocale,
      createTranslationImportTask,
      createTranslationExportTask,
      translate,
      findFirstByPermission,
      success,
      error,
      open,
    };
  }

  describe('init', () => {
    it('loads translations and auto-selects the first one', () => {
      const t1 = translation({ id: 't1' });
      const t2 = translation({ id: 't2' });
      const { component, findAll } = setup([t1, t2]);

      expect(findAll).toHaveBeenCalledWith('space-1');
      expect(component.translations()).toEqual([t1, t2]);
      expect(component.selectedTranslation()).toEqual(t1);
      expect(component.isLoading()).toBe(false);
    });

    it('defaults the filter locale to the space fallback locale', () => {
      const { component } = setup([], space({ localeFallback: de }));

      expect(component.filterForm.value.locale).toBe('de');
    });
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

  describe('identifyTranslationStatus / identifyLocaleStatus', () => {
    it('is UNTRANSLATED when there are no locale values at all', () => {
      const { component } = setup([], space());

      expect(component.identifyTranslationStatus(translation({ locales: {} }))).toBe(TranslationStatus.UNTRANSLATED);
    });

    it('is TRANSLATED when every space locale has a value', () => {
      const { component } = setup([], space());

      expect(component.identifyTranslationStatus(translation({ locales: { en: 'Hi', de: 'Hallo' } }))).toBe(TranslationStatus.TRANSLATED);
    });

    it('is PARTIALLY_TRANSLATED when only some space locales have a value', () => {
      const { component } = setup([], space());

      expect(component.identifyTranslationStatus(translation({ locales: { en: 'Hi' } }))).toBe(TranslationStatus.PARTIALLY_TRANSLATED);
    });

    it('identifyLocaleStatus treats an empty/whitespace value as untranslated', () => {
      const { component } = setup();

      expect(component.identifyLocaleStatus(translation({ locales: { en: '  ' } }), 'en')).toBe(LocaleStatus.UNTRANSLATED);
      expect(component.identifyLocaleStatus(translation({ locales: { en: 'Hi' } }), 'en')).toBe(LocaleStatus.TRANSLATED);
    });
  });

  describe('filter form helpers', () => {
    it('filterReset() clears search/labels/states', () => {
      const { component } = setup();
      component.filterForm.patchValue({ search: 'x', labels: ['a'], states: [TranslationStatus.TRANSLATED] });

      component.filterReset();

      expect(component.filterForm.value).toMatchObject({ search: '', labels: [], states: [] });
    });

    it('isFormChanged() is false at defaults and true once search/labels/states are set', () => {
      const { component } = setup();
      expect(component.isFormChanged()).toBe(false);

      component.filterForm.patchValue({ search: 'x' });
      expect(component.isFormChanged()).toBe(true);
    });

    it('selectLabel() toggles a label on and off', () => {
      const { component } = setup();

      component.selectLabel('ui');
      expect(component.filterForm.value.labels).toEqual(['ui']);

      component.selectLabel('ui');
      expect(component.filterForm.value.labels).toEqual([]);
    });

    it('selectState() toggles a state on and off', () => {
      const { component } = setup();

      component.selectState(TranslationStatus.TRANSLATED);
      expect(component.filterForm.value.states).toEqual([TranslationStatus.TRANSLATED]);

      component.selectState(TranslationStatus.TRANSLATED);
      expect(component.filterForm.value.states).toEqual([]);
    });
  });

  it('selectTranslation() sets the selected translation', () => {
    const { component } = setup();
    const t = translation({ id: 't1' });

    component.selectTranslation(t);

    expect(component.selectedTranslation()).toEqual(t);
  });

  it('localeIdToString()/localeToString()/compareLocale()', () => {
    const { component } = setup();

    expect(component.localeIdToString('de')).toBe('German');
    expect(component.localeIdToString('fr')).toBe('fr');
    expect(component.localeToString(de)).toBe('German');
    expect(component.compareLocale(en, en)).toBe(true);
    expect(component.compareLocale(en, de)).toBe(false);
  });

  it('isLocaleTranslatable() rejects identical locales, otherwise delegates to LocaleService', () => {
    const { component } = setup();

    expect(component.isLocaleTranslatable(en, en)).toBe(false);
    expect(component.isLocaleTranslatable(en, de)).toBe(true);
  });

  describe('publish', () => {
    it('publishes and notifies success, resetting the loading flag after a delay', async () => {
      vi.useFakeTimers();
      const { component, publish, success } = setup();

      component.publish();

      expect(publish).toHaveBeenCalledWith('space-1');
      expect(success).toHaveBeenCalledWith('Translations has been published.');
      expect(component.isPublishLoading()).toBe(true);

      await vi.advanceTimersByTimeAsync(1000);
      expect(component.isPublishLoading()).toBe(false);
    });

    it('notifies an error on failure', () => {
      const { component, publish, error } = setup();
      publish.mockReturnValue(throwError(() => new Error('boom')));

      component.publish();

      expect(error).toHaveBeenCalledWith('Translations can not be published.');
    });
  });

  describe('openAddDialog', () => {
    it('creates the translation with only the fallback locale when auto-translate is off', () => {
      const { component, open, create, success } = setup();
      open.mockReturnValue({
        afterClosed: () => of({ id: 'new.id', type: TranslationType.STRING, value: 'Hello', labels: [], description: '' }),
      });

      component.openAddDialog();

      expect(create).toHaveBeenCalledWith('space-1', {
        id: 'new.id',
        type: TranslationType.STRING,
        locales: { en: 'Hello' },
        labels: [],
        description: '',
      });
      expect(success).toHaveBeenCalledWith('Translation has been added.');
    });

    it('auto-translates the other locales when requested for STRING type', () => {
      const { component, open, create, translate } = setup();
      open.mockReturnValue({
        afterClosed: () =>
          of({ id: 'new.id', type: TranslationType.STRING, value: 'Hello', labels: [], description: '', autoTranslate: true }),
      });

      component.openAddDialog();

      expect(translate).toHaveBeenCalledWith({ content: 'Hello', sourceLocale: 'en', targetLocale: 'de' });
      expect(create).toHaveBeenCalledWith('space-1', {
        id: 'new.id',
        type: TranslationType.STRING,
        locales: { en: 'Hello', de: 'translated' },
        labels: [],
        description: '',
      });
    });

    it('continues without a locale value when auto-translation of one locale fails', () => {
      const { component, open, create, translate } = setup();
      translate.mockReturnValue(throwError(() => new Error('boom')));
      open.mockReturnValue({
        afterClosed: () =>
          of({ id: 'new.id', type: TranslationType.STRING, value: 'Hello', labels: [], description: '', autoTranslate: true }),
      });

      component.openAddDialog();

      expect(create).toHaveBeenCalledWith('space-1', {
        id: 'new.id',
        type: TranslationType.STRING,
        locales: { en: 'Hello' },
        labels: [],
        description: '',
      });
    });

    it('does nothing when there is no selected space', () => {
      const { component, open } = setup([], NO_SPACE);

      component.openAddDialog();

      expect(open).not.toHaveBeenCalled();
    });

    it('notifies an error on failure', () => {
      const { component, open, create, error } = setup();
      create.mockReturnValue(throwError(() => new Error('boom')));
      open.mockReturnValue({
        afterClosed: () => of({ id: 'new.id', type: TranslationType.STRING, value: 'Hello', labels: [], description: '' }),
      });

      component.openAddDialog();

      expect(error).toHaveBeenCalledWith('Translation can not be added.');
    });
  });

  describe('openEditIdDialog', () => {
    it('updates the id and notifies success when confirmed', () => {
      const { component, open, updateId, success } = setup();
      open.mockReturnValue({ afterClosed: () => of('new.id') });
      const t = translation({ id: 't1' });

      component.openEditIdDialog(t);

      expect(updateId).toHaveBeenCalledWith('space-1', t, 'new.id');
      expect(success).toHaveBeenCalledWith('Translation ID has been updated.');
    });

    it('notifies an error on failure', () => {
      const { component, open, updateId, error } = setup();
      updateId.mockReturnValue(throwError(() => new Error('boom')));
      open.mockReturnValue({ afterClosed: () => of('new.id') });

      component.openEditIdDialog(translation({ id: 't1' }));

      expect(error).toHaveBeenCalledWith('Translation ID can not be updated.');
    });
  });

  describe('openEditDialog', () => {
    it('updates labels/description and notifies success when confirmed', () => {
      const { component, open, update, success } = setup();
      open.mockReturnValue({ afterClosed: () => of({ labels: ['ui'], description: 'desc' }) });
      const t = translation({ id: 't1' });

      component.openEditDialog(t);

      expect(update).toHaveBeenCalledWith('space-1', 't1', { labels: ['ui'], description: 'desc' });
      expect(success).toHaveBeenCalledWith('Translation has been updated.');
    });

    it('notifies an error on failure', () => {
      const { component, open, update, error } = setup();
      update.mockReturnValue(throwError(() => new Error('boom')));
      open.mockReturnValue({ afterClosed: () => of({ labels: [], description: '' }) });

      component.openEditDialog(translation({ id: 't1' }));

      expect(error).toHaveBeenCalledWith('Translation can not be updated.');
    });
  });

  describe('openDeleteDialog', () => {
    it('deletes and notifies success when confirmed', () => {
      const { component, open, deleteTranslation, success } = setup();
      open.mockReturnValue({ afterClosed: () => of(true) });

      component.openDeleteDialog(translation({ id: 't1' }));

      expect(deleteTranslation).toHaveBeenCalledWith('space-1', 't1');
      expect(success).toHaveBeenCalledWith('Translation has been deleted.');
    });

    it('does not delete when cancelled', () => {
      const { component, open, deleteTranslation } = setup();
      open.mockReturnValue({ afterClosed: () => of(false) });

      component.openDeleteDialog(translation({ id: 't1' }));

      expect(deleteTranslation).not.toHaveBeenCalled();
    });
  });

  describe('openImportDialog', () => {
    it('creates a FLAT import task with the chosen locale', () => {
      const { component, open, createTranslationImportTask, success } = setup();
      const file = new File(['data'], 'de.json');
      open.mockReturnValue({ afterClosed: () => of({ kind: 'FLAT', locale: 'de', file }) });

      component.openImportDialog([en, de]);

      expect(createTranslationImportTask).toHaveBeenCalledWith('space-1', file, 'de');
      expect(success).toHaveBeenCalledWith('Translation Import Task has been created.', expect.anything());
    });

    it('creates a FULL import task without a locale', () => {
      const { component, open, createTranslationImportTask } = setup();
      const file = new File(['data'], 'export.llt.zip');
      open.mockReturnValue({ afterClosed: () => of({ kind: 'FULL', file }) });

      component.openImportDialog([en, de]);

      expect(createTranslationImportTask).toHaveBeenCalledWith('space-1', file);
    });

    it('notifies an error on failure', () => {
      const { component, open, createTranslationImportTask, error } = setup();
      createTranslationImportTask.mockReturnValue(throwError(() => new Error('boom')));
      open.mockReturnValue({ afterClosed: () => of({ kind: 'FULL', file: new File([], 'a.zip') }) });

      component.openImportDialog([en, de]);

      expect(error).toHaveBeenCalledWith('Translation Import Task can not be created.');
    });
  });

  describe('openExportDialog', () => {
    it('creates a FLAT export task with the chosen locale', () => {
      const { component, open, createTranslationExportTask, success } = setup();
      open.mockReturnValue({ afterClosed: () => of({ kind: 'FLAT', locale: 'de' }) });

      component.openExportDialog([en, de]);

      expect(createTranslationExportTask).toHaveBeenCalledWith('space-1', 'de');
      expect(success).toHaveBeenCalledWith('Translation Export Task has been created.', expect.anything());
    });

    it('creates a FULL export task without a locale', () => {
      const { component, open, createTranslationExportTask } = setup();
      open.mockReturnValue({ afterClosed: () => of({ kind: 'FULL' }) });

      component.openExportDialog([en, de]);

      expect(createTranslationExportTask).toHaveBeenCalledWith('space-1');
    });
  });

  describe('openTranslateLocaleDialog', () => {
    it('translates the locale and notifies success when confirmed', () => {
      const { component, open, translateLocale, success } = setup();
      open.mockReturnValue({ afterClosed: () => of({ sourceLocale: 'en', targetLocale: 'de' }) });

      component.openTranslateLocaleDialog([en, de]);

      expect(translateLocale).toHaveBeenCalledWith('space-1', 'en', 'de');
      expect(success).toHaveBeenCalledWith('Locale Translate run with success.');
    });

    it('notifies an error on failure', () => {
      const { component, open, translateLocale, error } = setup();
      translateLocale.mockReturnValue(throwError(() => new Error('boom')));
      open.mockReturnValue({ afterClosed: () => of({ sourceLocale: 'en', targetLocale: 'de' }) });

      component.openTranslateLocaleDialog([en, de]);

      expect(error).toHaveBeenCalledWith('Locale Translate failed.');
    });
  });

  describe('updateLocale', () => {
    it('updates the locale and notifies success, resetting loading state after a delay', async () => {
      vi.useFakeTimers();
      const { component, updateLocale, success } = setup();
      const t = translation({ id: 't1' });

      component.updateLocale(t, de, 'Hallo');

      expect(updateLocale).toHaveBeenCalledWith('space-1', 't1', 'de', 'Hallo');
      expect(success).toHaveBeenCalledWith('Translation has been updated.');
      expect(component.isLocaleUpdateLoading()).toBe(true);
      expect(component.translationUpdateId()).toBe('t1');

      await vi.advanceTimersByTimeAsync(1000);

      expect(component.isLocaleUpdateLoading()).toBe(false);
      expect(component.translationUpdateId()).toBeUndefined();
    });

    it('notifies an error on failure', () => {
      const { component, updateLocale, error } = setup();
      updateLocale.mockReturnValue(throwError(() => new Error('boom')));

      component.updateLocale(translation({ id: 't1' }), de, 'Hallo');

      expect(error).toHaveBeenCalledWith('Translation can not be updated.');
    });
  });

  describe('token-gated API links', () => {
    it('openDraftV1InNewTab() fetches a draft token then opens the link', () => {
      const { component, findFirstByPermission } = setup();
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      component.openDraftV1InNewTab('en');

      expect(findFirstByPermission).toHaveBeenCalledWith('space-1', TokenPermission.TRANSLATION_DRAFT);
      expect(openSpy).toHaveBeenCalled();
      expect(component['availableToken']).toBe('token1');
      openSpy.mockRestore();
    });

    it('openDraftV1InNewTab() reuses the cached token on a second call', () => {
      const { component, findFirstByPermission } = setup();
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      component.openDraftV1InNewTab('en');
      findFirstByPermission.mockClear();

      component.openDraftV1InNewTab('de');

      expect(findFirstByPermission).not.toHaveBeenCalled();
      openSpy.mockRestore();
    });

    it('openDraftV1InNewTab() notifies an error when no single token is available', () => {
      const { component, findFirstByPermission, error } = setup();
      findFirstByPermission.mockReturnValue(of([]));

      component.openDraftV1InNewTab('en');

      expect(error).toHaveBeenCalledWith('Please create Access Token with Translation Draft Permission in your Space Settings');
    });

    it('openPublishedV1InNewTab() fetches a public token then opens the link', () => {
      const { component, findFirstByPermission } = setup();
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      component.openPublishedV1InNewTab('en');

      expect(findFirstByPermission).toHaveBeenCalledWith('space-1', TokenPermission.TRANSLATION_PUBLIC);
      expect(openSpy).toHaveBeenCalled();
      openSpy.mockRestore();
    });

    it('openPublishedV1InNewTab() notifies an error when no single token is available', () => {
      const { component, findFirstByPermission, error } = setup();
      findFirstByPermission.mockReturnValue(of([{ id: 'a' } as Token, { id: 'b' } as Token]));

      component.openPublishedV1InNewTab('en');

      expect(error).toHaveBeenCalledWith('Please create Access Token with Translation Public Permission in your Space Settings');
    });
  });

  describe('translate', () => {
    it('translates the selected translation content and notifies success', async () => {
      vi.useFakeTimers();
      const t = translation({ id: 't1', locales: { en: 'Hello' } });
      const { component, translate, success } = setup([t]);

      component.translate();

      expect(translate).toHaveBeenCalledWith({ content: 'Hello', sourceLocale: 'en', targetLocale: 'en' });
      expect(component.selectedTranslationLocaleValue()).toBe('translated');
      expect(success).toHaveBeenCalledWith('Translated');
      expect(component.isTranslateLoading()).toBe(true);

      await vi.advanceTimersByTimeAsync(1000);
      expect(component.isTranslateLoading()).toBe(false);
    });

    it('notifies an error with a documentation link on failure', () => {
      const t = translation({ id: 't1', locales: { en: 'Hello' } });
      const { component, translate, error } = setup([t]);
      translate.mockReturnValue(throwError(() => new Error('boom')));

      component.translate();

      expect(error).toHaveBeenCalledWith('Can not be translation.', expect.anything());
    });
  });

  it('copied() notifies success', () => {
    const { component, success } = setup();

    component.copied();

    expect(success).toHaveBeenCalledWith('Translation ID copied to clipboard.');
  });

  describe('captureKeyboard', () => {
    it('saves the selected translation locale value on Ctrl/Cmd+S', () => {
      const t = translation({ id: 't1', locales: { en: 'Hello' } });
      const { component, updateLocale } = setup([t], space(), true);
      const event = { preventDefault: vi.fn() } as unknown as KeyboardEvent;

      component.captureKeyboard(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(updateLocale).toHaveBeenCalledWith('space-1', 't1', 'en', 'Hello');
    });

    it('does nothing for other key combinations', () => {
      const { component, updateLocale } = setup([translation()], space(), false);
      const event = { preventDefault: vi.fn() } as unknown as KeyboardEvent;

      component.captureKeyboard(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(updateLocale).not.toHaveBeenCalled();
    });
  });
});
