import { TestBed } from '@angular/core/testing';
import { Locale, Page, Space, SpaceLocale } from '@localess/shared';
import { LocaleService } from '@core/services/locale.service';
import { NotificationService } from '@core/services/notification.service';
import { SpaceService } from '@core/services/space.service';
import { SpaceStore } from '@core/stores/space.store';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { computed, signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { LocalesComponent } from './locales.component';
import { SpaceLocaleService } from './space-locale.service';

/** The space's locales as `GET …/locales` answers them, each with its locale. */
const spaceLocales = (locales: Locale[]): SpaceLocale[] =>
  locales.map((locale, position) => ({ spaceId: 'space-1', localeId: locale.id, position, createdAt: '', locale }));

/** One page holding `locales`. */
const pageOf = (locales: Locale[]): Page<SpaceLocale> => ({ items: spaceLocales(locales), page: 0, size: 20, total: locales.length });

/** The selected space with its locales (`spaceLocales`, as `GET /spaces/:id` answers them); the first the default. */
function space(locales: Locale[]): Space {
  return { id: 'space-1', name: 'Space 1', defaultLocaleId: locales[0]?.id, defaultLocale: locales[0], spaceLocales: spaceLocales(locales) } as Space;
}

describe('LocalesComponent', () => {
  function setup(space: Space | undefined) {
    const selectedSpace = signal(space);
    const findAll = vi.fn().mockReturnValue(of(pageOf((space?.spaceLocales ?? []).flatMap(it => (it.locale ? [it.locale] : [])))));
    const create = vi.fn().mockReturnValue(of(undefined));
    const deleteLocale = vi.fn().mockReturnValue(of(undefined));
    const setDefault = vi.fn().mockReturnValue(of(undefined));
    const reorder = vi.fn().mockReturnValue(of(undefined));
    const isLocaleTranslatableFrom = vi.fn().mockReturnValue(true);
    const isLocaleTranslatableTo = vi.fn().mockReturnValue(false);
    const success = vi.fn();
    const error = vi.fn();
    // Both dialogs run on Spartan now, so one mock covers them - the result arrives on `closed$`,
    // which (unlike `afterClosed()`) never completes, hence the component's `take(1)`.
    const openDialog = vi.fn();

    TestBed.overrideComponent(LocalesComponent, {
      set: { template: '<table llTableSort></table><ll-paginator [length]="0" />' },
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: SpaceLocaleService, useValue: { findAll, create, remove: deleteLocale, reorder } },
        { provide: SpaceService, useValue: { setDefaultLocale: setDefault } },
        { provide: LocaleService, useValue: { isLocaleTranslatableFrom, isLocaleTranslatableTo } },
        { provide: NotificationService, useValue: { success, error } },
        { provide: HlmDialogService, useValue: { open: openDialog } },
        {
          provide: SpaceStore,
          useValue: {
            selectedSpace,
            selectedSpaceId: computed(() => selectedSpace()?.id),
            locales: computed(() => (selectedSpace()?.spaceLocales ?? []).flatMap(it => (it.locale ? [it.locale] : []))),
            defaultLocale: computed(() => selectedSpace()?.defaultLocale),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(LocalesComponent);
    fixture.detectChanges();
    return {
      component: fixture.componentInstance,
      fixture,
      findAll,
      create,
      deleteLocale,
      setDefault,
      reorder,
      isLocaleTranslatableFrom,
      isLocaleTranslatableTo,
      success,
      error,
      openDialog,
    };
  }

  const en: Locale = { id: 'en', name: 'English' };
  const de: Locale = { id: 'de', name: 'German' };

  it('starts loading until a space is selected', () => {
    const { component } = setup(undefined);

    expect(component.isLoading()).toBe(true);
  });

  it("loads the first page of the space's locales once the space arrives", () => {
    const { component, findAll } = setup(space([en, de]));

    expect(findAll.mock.lastCall![0]).toBe('space-1');
    expect(findAll.mock.lastCall![1].toString()).toBe('page=0&size=20');
    expect(component.dataSource.filteredData()).toEqual([en, de]);
    expect(component.total()).toBe(2);
    expect(component.isLoading()).toBe(false);
  });

  it('loads nothing until a space is selected', () => {
    const { findAll } = setup(undefined);

    expect(findAll).not.toHaveBeenCalled();
  });

  it('onFilterChange() searches on the server from the first page', () => {
    const { component, fixture, findAll } = setup(space([en, de]));
    component.list.page.set(1);
    fixture.detectChanges();

    component.onFilterChange({ search: ' ger ' });
    fixture.detectChanges();

    expect(findAll.mock.lastCall![1].toString()).toBe('page=0&size=20&search=ger');
  });

  it('onSortChange() sorts on the server; cleared, back to the space order', () => {
    const { component, fixture, findAll } = setup(space([en, de]));

    component.onSortChange({ active: 'name', direction: 'desc' });
    fixture.detectChanges();
    expect(findAll.mock.lastCall![1].toString()).toBe('page=0&size=20&sort=name&direction=desc');

    component.onSortChange({ active: 'name', direction: '' });
    fixture.detectChanges();
    expect(findAll.mock.lastCall![1].toString()).toBe('page=0&size=20');
  });

  it('notifies a failed load, and loads again on the next query change', () => {
    const { component, fixture, findAll, error } = setup(undefined);
    findAll.mockReturnValue(of(pageOf([en]))).mockReturnValueOnce(throwError(() => new Error('boom')));
    // The space arrives: its first load fails.
    (TestBed.inject(SpaceStore).selectedSpace as ReturnType<typeof signal<Space | undefined>>).set(space([en]));
    fixture.detectChanges();
    expect(error).toHaveBeenCalledWith('Locales can not be loaded.');

    component.onFilterChange({ search: 'en' });
    fixture.detectChanges();
    expect(component.dataSource.filteredData()).toEqual([en]);
  });

  it('openAddDialog() creates the locale and notifies success when confirmed', () => {
    const { component, openDialog, create, success } = setup(space([en]));
    openDialog.mockReturnValue({ closed$: of({ locale: de }) });

    component.openAddDialog();

    expect(create).toHaveBeenCalledWith('space-1', de);
    expect(success).toHaveBeenCalledWith('Locale has been added.');
  });

  it('openAddDialog() does nothing when dismissed', () => {
    const { component, openDialog, create } = setup(space([en]));
    openDialog.mockReturnValue({ closed$: of(undefined) });

    component.openAddDialog();

    expect(create).not.toHaveBeenCalled();
  });

  it('openAddDialog() notifies an error on failure', () => {
    const { component, openDialog, create, error } = setup(space([en]));
    create.mockReturnValue(throwError(() => new Error('boom')));
    openDialog.mockReturnValue({ closed$: of({ locale: de }) });

    component.openAddDialog();

    expect(error).toHaveBeenCalledWith('Locale can not be added.');
  });

  it('openDeleteDialog() deletes and notifies success when confirmed (the page reloads on the change event)', () => {
    const { component, openDialog, deleteLocale, success } = setup(space([en, de]));
    openDialog.mockReturnValue({ closed$: of(true) });

    component.openDeleteDialog(de);

    expect(deleteLocale).toHaveBeenCalledWith('space-1', de);
    expect(success).toHaveBeenCalledWith("Locale 'German' has been deleted.");
  });

  it('openDeleteDialog() does not delete when cancelled', () => {
    const { component, openDialog, deleteLocale } = setup(space([en, de]));
    openDialog.mockReturnValue({ closed$: of(undefined) });

    component.openDeleteDialog(de);

    expect(deleteLocale).not.toHaveBeenCalled();
  });

  it('openDeleteDialog() notifies an error on failure', () => {
    const { component, openDialog, deleteLocale, error } = setup(space([en, de]));
    deleteLocale.mockReturnValue(throwError(() => new Error('boom')));
    openDialog.mockReturnValue({ closed$: of(true) });

    component.openDeleteDialog(de);

    expect(error).toHaveBeenCalledWith("Locale 'German' can not be deleted.");
  });

  it('openSetDefaultDialog() warns that content values are not moved, then sets the default', () => {
    const { component, openDialog, setDefault, success } = setup(space([en, de]));
    openDialog.mockReturnValue({ closed$: of(true) });

    component.openSetDefaultDialog(de);

    const content = openDialog.mock.calls[0][1].context.content as string;
    expect(content).toContain("instead of 'English'");
    expect(content).toContain("are not moved: from now on they are read as 'German'");
    expect(setDefault).toHaveBeenCalledWith('space-1', de);
    expect(success).toHaveBeenCalledWith("Locale 'German' is now the default locale.");
  });

  it('openSetDefaultDialog() changes nothing when cancelled', () => {
    const { component, openDialog, setDefault } = setup(space([en, de]));
    openDialog.mockReturnValue({ closed$: of(undefined) });

    component.openSetDefaultDialog(de);

    expect(setDefault).not.toHaveBeenCalled();
  });

  it('openSetDefaultDialog() notifies an error on failure', () => {
    const { component, openDialog, setDefault, error } = setup(space([en, de]));
    setDefault.mockReturnValue(throwError(() => new Error('boom')));
    openDialog.mockReturnValue({ closed$: of(true) });

    component.openSetDefaultDialog(de);

    expect(error).toHaveBeenCalledWith("Locale 'German' can not be made the default locale.");
  });

  it('move() swaps a locale with its neighbour in the space order', () => {
    const fr: Locale = { id: 'fr', name: 'French' };
    const { component, reorder } = setup(space([en, de, fr]));

    component.move(fr, -1);
    expect(reorder).toHaveBeenLastCalledWith('space-1', ['en', 'fr', 'de']);

    component.move(en, 1);
    expect(reorder).toHaveBeenLastCalledWith('space-1', ['de', 'en', 'fr']);
  });

  it('canMove() is false at the ends, and move() then sends nothing', () => {
    const { component, reorder } = setup(space([en, de]));

    expect(component.canMove(en, -1)).toBe(false);
    expect(component.canMove(en, 1)).toBe(true);
    expect(component.canMove(de, 1)).toBe(false);
    component.move(de, 1);

    expect(reorder).not.toHaveBeenCalled();
  });

  it('move() notifies an error on failure', () => {
    const { component, reorder, error } = setup(space([en, de]));
    reorder.mockReturnValue(throwError(() => new Error('boom')));

    component.move(de, -1);

    expect(error).toHaveBeenCalledWith("Locale 'German' can not be moved.");
  });

  // The two columns are answered by two different predicates - a locale can be one-way.
  it('reports source and target support separately', () => {
    const { component, isLocaleTranslatableFrom, isLocaleTranslatableTo } = setup(space([en]));

    expect(component.isTranslatableFrom('en')).toBe(true);
    expect(component.isTranslatableTo('en')).toBe(false);
    expect(isLocaleTranslatableFrom).toHaveBeenCalledWith('en');
    expect(isLocaleTranslatableTo).toHaveBeenCalledWith('en');
  });
});
