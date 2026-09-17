import { TestBed } from '@angular/core/testing';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { Locale } from '@shared/models/locale.model';
import { Space } from '@shared/models/space.model';
import { Token, TokenPermission } from '@shared/models/token.model';
import { Translation, TranslationType } from '@shared/models/translation.model';
import { NotificationService } from '@shared/services/notification.service';
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

  function setup(translations: Translation[] = [], selectedSpace: Space | null = space()) {
    const resolvedSpace = selectedSpace === NO_SPACE ? undefined : selectedSpace;
    const findAll = vi.fn().mockReturnValue(of(translations));
    const create = vi.fn().mockReturnValue(of(undefined));
    const publish = vi.fn().mockReturnValue(of(undefined));
    const updateLocale = vi.fn().mockReturnValue(of(undefined));
    const translateLocale = vi.fn().mockReturnValue(of(undefined));
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
          useValue: { findAll, create, publish, updateLocale, translateLocale },
        },
        { provide: TaskService, useValue: { createTranslationImportTask, createTranslationExportTask } },
        { provide: HlmDialogService, useValue: { open } },
        { provide: NotificationService, useValue: { success, error } },
        { provide: TranslateService, useValue: { translate } },
        { provide: TokenService, useValue: { findFirstByPermission } },
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
  });

  it('allLabels() dedupes labels across all loaded translations', () => {
    const { component } = setup([
      translation({ id: 't1', labels: ['ui', 'marketing'] }),
      translation({ id: 't2', labels: ['ui'] }),
      translation({ id: 't3', labels: undefined }),
    ]);

    expect(component.allLabels()).toEqual(['ui', 'marketing']);
  });

  it('selectTranslation() sets the selected translation', () => {
    const { component } = setup();
    const t = translation({ id: 't1' });

    component.selectTranslation(t);

    expect(component.selectedTranslation()).toEqual(t);
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
        closed$: of({ id: 'new.id', type: TranslationType.STRING, value: 'Hello', labels: [], description: '' }),
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
        closed$: of({ id: 'new.id', type: TranslationType.STRING, value: 'Hello', labels: [], description: '', autoTranslate: true }),
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
        closed$: of({ id: 'new.id', type: TranslationType.STRING, value: 'Hello', labels: [], description: '', autoTranslate: true }),
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
        closed$: of({ id: 'new.id', type: TranslationType.STRING, value: 'Hello', labels: [], description: '' }),
      });

      component.openAddDialog();

      expect(error).toHaveBeenCalledWith('Translation can not be added.');
    });
  });

  describe('openImportDialog', () => {
    it('creates a FLAT import task with the chosen locale', () => {
      const { component, open, createTranslationImportTask, success } = setup();
      const file = new File(['data'], 'de.json');
      open.mockReturnValue({ closed$: of({ kind: 'FLAT', locale: 'de', file }) });

      component.openImportDialog([en, de]);

      expect(createTranslationImportTask).toHaveBeenCalledWith('space-1', file, 'de');
      expect(success).toHaveBeenCalledWith('Translation Import Task has been created.', expect.anything());
    });

    it('creates a FULL import task without a locale', () => {
      const { component, open, createTranslationImportTask } = setup();
      const file = new File(['data'], 'export.llt.zip');
      open.mockReturnValue({ closed$: of({ kind: 'FULL', file }) });

      component.openImportDialog([en, de]);

      expect(createTranslationImportTask).toHaveBeenCalledWith('space-1', file);
    });

    it('notifies an error on failure', () => {
      const { component, open, createTranslationImportTask, error } = setup();
      createTranslationImportTask.mockReturnValue(throwError(() => new Error('boom')));
      open.mockReturnValue({ closed$: of({ kind: 'FULL', file: new File([], 'a.zip') }) });

      component.openImportDialog([en, de]);

      expect(error).toHaveBeenCalledWith('Translation Import Task can not be created.');
    });
  });

  describe('openExportDialog', () => {
    it('creates a FLAT export task with the chosen locale', () => {
      const { component, open, createTranslationExportTask, success } = setup();
      open.mockReturnValue({ closed$: of({ kind: 'FLAT', locale: 'de' }) });

      component.openExportDialog([en, de]);

      expect(createTranslationExportTask).toHaveBeenCalledWith('space-1', 'de');
      expect(success).toHaveBeenCalledWith('Translation Export Task has been created.', expect.anything());
    });

    it('creates a FULL export task without a locale', () => {
      const { component, open, createTranslationExportTask } = setup();
      open.mockReturnValue({ closed$: of({ kind: 'FULL' }) });

      component.openExportDialog([en, de]);

      expect(createTranslationExportTask).toHaveBeenCalledWith('space-1');
    });
  });

  describe('openTranslateLocaleDialog', () => {
    it('translates the locale and notifies success when confirmed', () => {
      const { component, open, translateLocale, success } = setup();
      open.mockReturnValue({ closed$: of({ sourceLocale: 'en', targetLocale: 'de' }) });

      component.openTranslateLocaleDialog([en, de]);

      expect(translateLocale).toHaveBeenCalledWith('space-1', 'en', 'de');
      expect(success).toHaveBeenCalledWith('Locale Translate run with success.');
    });

    it('notifies an error on failure', () => {
      const { component, open, translateLocale, error } = setup();
      translateLocale.mockReturnValue(throwError(() => new Error('boom')));
      open.mockReturnValue({ closed$: of({ sourceLocale: 'en', targetLocale: 'de' }) });

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
});
