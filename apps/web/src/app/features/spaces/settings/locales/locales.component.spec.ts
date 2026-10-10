import { TestBed } from '@angular/core/testing';
import { Locale, Space } from '@localess/shared';
import { LocaleService } from '@core/services/locale.service';
import { NotificationService } from '@core/services/notification.service';
import { SpaceStore } from '@core/stores/space.store';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { LocalesComponent } from './locales.component';

function space(locales: Locale[]): Space {
  return { id: 'space-1', name: 'Space 1', locales, defaultLocale: locales[0] } as Space;
}

describe('LocalesComponent', () => {
  function setup(selectedSpace: Space | undefined) {
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
        {
          provide: LocaleService,
          useValue: { create, delete: deleteLocale, setDefault, reorder, isLocaleTranslatableFrom, isLocaleTranslatableTo },
        },
        { provide: NotificationService, useValue: { success, error } },
        { provide: HlmDialogService, useValue: { open: openDialog } },
        { provide: SpaceStore, useValue: { selectedSpace: signal(selectedSpace), selectedSpaceId: signal('space-1') } },
      ],
    });
    const fixture = TestBed.createComponent(LocalesComponent);
    fixture.detectChanges();
    return {
      component: fixture.componentInstance,
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

  it('loads the space locales once the space arrives', () => {
    const { component } = setup(space([en, de]));

    expect(component.dataSource.filteredData()).toEqual([en, de]);
    expect(component.isLoading()).toBe(false);
  });

  it('onFilterChange() serializes the filter value onto the data source', () => {
    const { component } = setup(space([en]));

    component.onFilterChange({ search: 'en' });

    expect(component.dataSource.filter).toBe(JSON.stringify({ search: 'en' }));
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

  it('openDeleteDialog() deletes, removes it locally, and notifies success when confirmed', () => {
    const { component, openDialog, deleteLocale, success } = setup(space([en, de]));
    openDialog.mockReturnValue({ closed$: of(true) });

    component.openDeleteDialog(de);

    expect(deleteLocale).toHaveBeenCalledWith('space-1', de);
    expect(component.dataSource.filteredData()).toEqual([en]);
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
