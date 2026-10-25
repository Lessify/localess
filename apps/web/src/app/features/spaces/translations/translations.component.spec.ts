import { HttpErrorResponse } from '@angular/common/http';
import { TRANSLATE_NOT_CONFIGURED } from '@core/utils/translate-error';
import { TestBed } from '@angular/core/testing';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { Locale, Space, Token, TokenType, Translation } from '@localess/shared';
import { NotificationService } from '@core/services/notification.service';
import { TaskService } from '@core/services/task.service';
import { SpaceTokenService } from '@core/services/space-token.service';
import { TranslateService } from '@core/services/translate.service';
import { TranslationService } from '@core/services/translation.service';
import { SpaceStore } from '@core/stores/space.store';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { TranslationsComponent } from './translations.component';

const en: Locale = { id: 'en', name: 'English' };
const de: Locale = { id: 'de', name: 'German' };

/** The selected space with its locales (`spaceLocales`, as `GET /spaces/:id` answers them); `en` the default. */
function space(overrides: Partial<Space> & { locales?: Locale[] } = {}): Space {
  const { locales = [en, de], ...rest } = overrides;
  const spaceLocales = locales.map((locale, position) => ({ spaceId: 'space-1', localeId: locale.id, position, createdAt: '', locale }));
  return { id: 'space-1', name: 'Space 1', defaultLocaleId: 'en', defaultLocale: en, spaceLocales, ...rest } as Space;
}

function translation(overrides: Partial<Translation> = {}): Translation {
  // The key follows the id unless given, so tests can name translations by either.
  return { id: 't1', key: overrides.id ?? 't1', locales: { en: 'Hello' }, ...overrides } as Translation;
}

const saveAs = vi.hoisted(() => vi.fn());
vi.mock('file-saver-es', () => ({ saveAs }));

describe('TranslationsComponent', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const NO_SPACE = null;

  function setup(labels: string[] = [], selectedSpace: Space | null = space()) {
    const resolvedSpace = selectedSpace === NO_SPACE ? undefined : selectedSpace;
    const findLabels = vi.fn().mockReturnValue(of(labels));
    const findOne = vi.fn((_spaceId: string, id: string) => of(translation({ id, locales: { en: 'Fresh' } })));
    const isKeyTaken = vi.fn().mockReturnValue(of(false));
    const create = vi.fn().mockReturnValue(of(undefined));
    const publish = vi.fn().mockReturnValue(of(undefined));
    const updateLocale = vi.fn().mockReturnValue(of(undefined));
    const exportLocaleUrl = vi.fn((spaceId: string, locale: string) => `/api/app/spaces/${spaceId}/translations/export/${locale}`);
    const createTranslationImport = vi.fn().mockReturnValue(of({ id: 'task1' }));
    const createTranslationExport = vi.fn().mockReturnValue(of({ id: 'task1' }));
    const createTranslationTranslate = vi.fn().mockReturnValue(of({ id: 'task1' }));
    const translate = vi.fn().mockReturnValue(of('translated'));
    const firstValue = vi.fn().mockReturnValue(of('token1'));
    const success = vi.fn();
    const error = vi.fn();
    const open = vi.fn();

    TestBed.overrideComponent(TranslationsComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        {
          provide: TranslationService,
          useValue: { findLabels, findOne, isKeyTaken, create, publish, updateLocale, exportLocaleUrl },
        },
        { provide: TaskService, useValue: { createTranslationImport, createTranslationExport, createTranslationTranslate } },
        { provide: HlmDialogService, useValue: { open } },
        { provide: NotificationService, useValue: { success, error } },
        { provide: TranslateService, useValue: { translate } },
        { provide: SpaceTokenService, useValue: { firstValue } },
        {
          provide: SpaceStore,
          useValue: {
            selectedSpace: signal(resolvedSpace),
            locales: signal((resolvedSpace?.spaceLocales ?? []).flatMap(it => (it.locale ? [it.locale] : []))),
            defaultLocale: signal(resolvedSpace?.defaultLocale),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(TranslationsComponent);
    fixture.componentRef.setInput('spaceId', 'space-1');
    fixture.detectChanges();
    return {
      component: fixture.componentInstance,
      findLabels,
      findOne,
      isKeyTaken,
      create,
      publish,
      updateLocale,
      exportLocaleUrl,
      createTranslationImport,
      createTranslationExport,
      createTranslationTranslate,
      translate,
      firstValue,
      success,
      error,
      open,
    };
  }

  it('loads the labels of the space', () => {
    const { component, findLabels } = setup(['marketing', 'ui']);

    expect(findLabels).toHaveBeenCalledWith('space-1');
    expect(component.allLabels()).toEqual(['marketing', 'ui']);
    expect(component.isLoading()).toBe(false);
  });

  it('selects the first key the list shows when nothing is selected, then follows it live', () => {
    const { component, findOne } = setup();

    component.onFirstTranslation(translation({ id: 't1' }));
    TestBed.tick();
    component.onFirstTranslation(translation({ id: 't2' }));
    TestBed.tick();

    expect(findOne).toHaveBeenCalledExactlyOnceWith('space-1', 't1');
    expect(component.selectedTranslation()).toEqual(translation({ id: 't1', locales: { en: 'Fresh' } }));
  });

  it('clears the selection when the selected translation is gone', () => {
    const { component, findOne } = setup();
    findOne.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));

    component.selectTranslation(translation({ id: 't1' }));
    TestBed.tick();

    expect(component.selectedTranslation()).toBeUndefined();
  });

  it('after a delete, selects the first key shown, but not the deleted one while it is still shown', () => {
    const { component, findOne } = setup();
    findOne.mockImplementation((_spaceId: string, id: string) =>
      id === 't1' ? throwError(() => new HttpErrorResponse({ status: 404 })) : of(translation({ id })),
    );
    component.onFirstTranslation(translation({ id: 't1' }));
    TestBed.tick();

    expect(findOne).toHaveBeenCalledExactlyOnceWith('space-1', 't1');
    expect(component.selectedTranslation()).toBeUndefined();

    // The list read again without it.
    component.onFirstTranslation(translation({ id: 't2' }));
    TestBed.tick();

    expect(component.selectedTranslation()).toEqual(translation({ id: 't2' }));
  });

  it('asks the server whether a key is taken (the add and rename dialogs)', () => {
    const { component, isKeyTaken } = setup();

    component.isKeyTaken('home.title').subscribe();

    expect(isKeyTaken).toHaveBeenCalledWith('space-1', 'home.title');
  });

  describe('publish', () => {
    it('publishes and notifies success, resetting the loading flag after a delay', async () => {
      vi.useFakeTimers();
      const { component, publish, success } = setup();

      component.publish();

      expect(publish).toHaveBeenCalledWith('space-1');
      expect(success).toHaveBeenCalledWith('Translations have been published.');
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
    it('creates the translation with only the default locale when auto-translate is off', () => {
      const { component, open, create, success } = setup();
      open.mockReturnValue({
        closed$: of({ key: 'new.id', value: 'Hello', labels: [], description: '' }),
      });

      component.openAddDialog();

      expect(create).toHaveBeenCalledWith('space-1', {
        key: 'new.id',
        locales: { en: 'Hello' },
        labels: [],
        description: '',
      });
      expect(success).toHaveBeenCalledWith('Translation has been added.');
    });

    it('auto-translates the other locales when requested', () => {
      const { component, open, create, translate } = setup();
      open.mockReturnValue({
        closed$: of({ key: 'new.id', value: 'Hello', labels: [], description: '', autoTranslate: true }),
      });

      component.openAddDialog();

      expect(translate).toHaveBeenCalledWith({ content: 'Hello', sourceLocale: 'en', targetLocale: 'de' });
      expect(create).toHaveBeenCalledWith('space-1', {
        key: 'new.id',
        locales: { en: 'Hello', de: 'translated' },
        labels: [],
        description: '',
      });
    });

    it('continues without a locale value when auto-translation of one locale fails', () => {
      const { component, open, create, translate } = setup();
      translate.mockReturnValue(throwError(() => new Error('boom')));
      open.mockReturnValue({
        closed$: of({ key: 'new.id', value: 'Hello', labels: [], description: '', autoTranslate: true }),
      });

      component.openAddDialog();

      expect(create).toHaveBeenCalledWith('space-1', {
        key: 'new.id',
        locales: { en: 'Hello' },
        labels: [],
        description: '',
      });
    });

    it('creates the translation and explains once when auto-translate is not configured', () => {
      const { component, open, create, translate, error, success } = setup();
      translate.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 412, error: { message: 'not configured' } })));
      open.mockReturnValue({
        closed$: of({ key: 'new.id', value: 'Hello', labels: [], description: '', autoTranslate: true }),
      });

      component.openAddDialog();

      expect(create).toHaveBeenCalledWith('space-1', expect.objectContaining({ locales: { en: 'Hello' } }));
      expect(success).toHaveBeenCalledWith('Translation has been added.');
      expect(error).toHaveBeenCalledExactlyOnceWith(TRANSLATE_NOT_CONFIGURED);
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
        closed$: of({ key: 'new.id', value: 'Hello', labels: [], description: '' }),
      });

      component.openAddDialog();

      expect(error).toHaveBeenCalledWith('Translation can not be added.');
    });
  });

  /** The progress dialog opened for a created task (the second dialog.open call). */
  const progressContext = (open: ReturnType<typeof vi.fn>) => open.mock.calls[1]?.[1]?.context;

  describe('openImportDialog', () => {
    it('imports a key-value JSON into its locale, and follows the task', () => {
      const { component, open, createTranslationImport } = setup();
      const file = new File(['data'], 'de.json');
      open.mockReturnValue({ closed$: of({ locale: 'de', file }) });

      component.openImportDialog([en, de]);

      expect(createTranslationImport).toHaveBeenCalledWith('space-1', file, 'de');
      expect(progressContext(open)).toEqual({ spaceId: 'space-1', task: { id: 'task1' }, title: 'Translations Import' });
    });

    it('imports a Localess file without a locale', () => {
      const { component, open, createTranslationImport } = setup();
      const file = new File(['data'], 'site-translations.localess.zip');
      open.mockReturnValue({ closed$: of({ file }) });

      component.openImportDialog([en, de]);

      expect(createTranslationImport).toHaveBeenCalledWith('space-1', file, undefined);
    });

    it("tells the server's reason when the import can not be created", () => {
      const { component, open, createTranslationImport, error } = setup();
      createTranslationImport.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 400, error: { message: 'Expected a .json file' } })),
      );
      open.mockReturnValue({ closed$: of({ file: new File([], 'a.zip'), locale: 'de' }) });

      component.openImportDialog([en, de]);

      expect(error).toHaveBeenCalledWith('Translations can not be imported: Expected a .json file');
    });
  });

  describe('openExportDialog', () => {
    it('downloads one locale at once, without a task', () => {
      const { component, open, createTranslationExport } = setup();
      open.mockReturnValue({ closed$: of({ kind: 'LOCALE', locale: 'de' }) });

      component.openExportDialog([en, de]);

      expect(saveAs).toHaveBeenCalledWith('/api/app/spaces/space-1/translations/export/de', 'de.json');
      expect(createTranslationExport).not.toHaveBeenCalled();
    });

    it('exports all translations as a task, and follows it', () => {
      const { component, open, createTranslationExport } = setup();
      open.mockReturnValue({ closed$: of({ kind: 'FULL' }) });

      component.openExportDialog([en, de]);

      expect(createTranslationExport).toHaveBeenCalledWith('space-1');
      expect(progressContext(open)).toMatchObject({ title: 'Translations Export' });
    });
  });

  describe('openTranslateLocaleDialog', () => {
    function run(result: unknown) {
      const { component, open, createTranslationTranslate, error } = setup();
      createTranslationTranslate.mockReturnValue(result);
      open.mockReturnValue({ closed$: of({ sourceLocale: 'en', targetLocale: 'de', overwrite: true }) });
      component.openTranslateLocaleDialog([en, de]);
      return { createTranslationTranslate, error, open };
    }

    // The task writes every key at once, so the dialog has to say it saves; the column on show is the likely target.
    it('opens the dialog in save mode, on the locale the list shows', () => {
      const { component, open } = setup();
      open.mockReturnValue({ closed$: of(undefined) });
      component.currentLocale.set('de');

      component.openTranslateLocaleDialog([en, de]);

      expect(open.mock.calls[0][1].context).toMatchObject({ mode: 'save', locales: [en, de], selectedLocale: 'de' });
    });

    it('starts a translate-locale task and follows it', () => {
      const { createTranslationTranslate, open } = run(of({ id: 'task1' }));
      expect(createTranslationTranslate).toHaveBeenCalledWith('space-1', { sourceLocale: 'en', targetLocale: 'de', overwrite: true });
      expect(progressContext(open)).toMatchObject({ title: 'Locale Translation' });
    });

    it('explains that translation is not configured on a 412', () => {
      const { error } = run(throwError(() => new HttpErrorResponse({ status: 412, error: { message: 'not configured' } })));
      expect(error).toHaveBeenCalledWith(TRANSLATE_NOT_CONFIGURED);
    });

    it('notifies a plain error on other failures', () => {
      const { error } = run(throwError(() => new Error('boom')));
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

  describe('API links', () => {
    it('openPublishedV1InNewTab() opens the link with a public token, or the preview one when the space has no public token', () => {
      const { component, firstValue } = setup();
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      component.openPublishedV1InNewTab('en');

      expect(firstValue).toHaveBeenCalledWith('space-1', [TokenType.PUBLIC, TokenType.PREVIEW]);
      expect(String(openSpy.mock.calls[0][0])).toContain('token=token1');
      openSpy.mockRestore();
    });

    it('openPublishedV1InNewTab() asks again on every click (a regenerated token is picked up)', () => {
      const { component, firstValue } = setup();
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      component.openPublishedV1InNewTab('en');
      firstValue.mockReturnValue(of('token2'));

      component.openPublishedV1InNewTab('en');

      expect(firstValue).toHaveBeenCalledTimes(2);
      expect(String(openSpy.mock.calls[1][0])).toContain('token=token2');
      openSpy.mockRestore();
    });

    it('openPublishedV1InNewTab() says which token to create when the space has none', () => {
      const { component, firstValue, error } = setup();
      firstValue.mockReturnValue(of(undefined));

      component.openPublishedV1InNewTab('en');

      expect(error).toHaveBeenCalledWith('Please create a Public Token in your Space Settings');
    });

    it('openPublishedV1InNewTab() says when the tokens could not be loaded', () => {
      const { component, firstValue, error } = setup();
      firstValue.mockReturnValue(throwError(() => new Error('403')));

      component.openPublishedV1InNewTab('en');

      expect(error).toHaveBeenCalledWith('Tokens could not be loaded');
    });

    it('openDraftV1InNewTab() opens the draft link with a preview token only', () => {
      const { component, firstValue } = setup();
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      component.openDraftV1InNewTab('en');

      expect(firstValue).toHaveBeenCalledWith('space-1', [TokenType.PREVIEW]);
      expect(String(openSpy.mock.calls[0][0])).toContain('version=draft');
      openSpy.mockRestore();
    });

    it('openDraftV1InNewTab() says to create a Preview Token when the space has none', () => {
      const { component, firstValue, error } = setup();
      firstValue.mockReturnValue(of(undefined));

      component.openDraftV1InNewTab('en');

      expect(error).toHaveBeenCalledWith('Please create a Preview Token in your Space Settings');
    });
  });
});
