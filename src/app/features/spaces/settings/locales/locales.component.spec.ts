import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Locale } from '@shared/models/locale.model';
import { Space } from '@shared/models/space.model';
import { LocaleService } from '@shared/services/locale.service';
import { NotificationService } from '@shared/services/notification.service';
import { SpaceStore } from '@shared/stores/space.store';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { LocalesComponent } from './locales.component';

function space(locales: Locale[]): Space {
  return { id: 'space-1', name: 'Space 1', locales, localeFallback: locales[0] } as Space;
}

describe('LocalesComponent', () => {
  function setup(selectedSpace: Space | undefined) {
    const create = vi.fn().mockReturnValue(of(undefined));
    const deleteLocale = vi.fn().mockReturnValue(of(undefined));
    const markAsFallback = vi.fn().mockReturnValue(of(undefined));
    const isLocaleTranslatableFrom = vi.fn().mockReturnValue(true);
    const isLocaleTranslatableTo = vi.fn().mockReturnValue(false);
    const success = vi.fn();
    const error = vi.fn();
    const open = vi.fn();

    TestBed.overrideComponent(LocalesComponent, {
      set: { template: '<table llTableSort></table><ll-paginator [length]="0" />' },
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: LocaleService, useValue: { create, delete: deleteLocale, markAsFallback, isLocaleTranslatableFrom, isLocaleTranslatableTo } },
        { provide: NotificationService, useValue: { success, error } },
        { provide: MatDialog, useValue: { open } },
        { provide: SpaceStore, useValue: { selectedSpace: signal(selectedSpace), selectedSpaceId: signal('space-1') } },
      ],
    });
    const fixture = TestBed.createComponent(LocalesComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, create, deleteLocale, markAsFallback, isLocaleTranslatableFrom, isLocaleTranslatableTo, success, error, open };
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
    const { component, open, create, success } = setup(space([en]));
    open.mockReturnValue({ afterClosed: () => of({ locale: de }) });

    component.openAddDialog();

    expect(create).toHaveBeenCalledWith('space-1', de);
    expect(success).toHaveBeenCalledWith('Locale has been added.');
  });

  it('openAddDialog() does nothing when dismissed', () => {
    const { component, open, create } = setup(space([en]));
    open.mockReturnValue({ afterClosed: () => of(undefined) });

    component.openAddDialog();

    expect(create).not.toHaveBeenCalled();
  });

  it('openAddDialog() notifies an error on failure', () => {
    const { component, open, create, error } = setup(space([en]));
    create.mockReturnValue(throwError(() => new Error('boom')));
    open.mockReturnValue({ afterClosed: () => of({ locale: de }) });

    component.openAddDialog();

    expect(error).toHaveBeenCalledWith('Locale can not be added.');
  });

  it('openDeleteDialog() deletes, removes it locally, and notifies success when confirmed', () => {
    const { component, open, deleteLocale, success } = setup(space([en, de]));
    open.mockReturnValue({ afterClosed: () => of(true) });

    component.openDeleteDialog(de);

    expect(deleteLocale).toHaveBeenCalledWith('space-1', de);
    expect(component.dataSource.filteredData()).toEqual([en]);
    expect(success).toHaveBeenCalledWith("Locale 'German' has been deleted.");
  });

  it('openDeleteDialog() does not delete when cancelled', () => {
    const { component, open, deleteLocale } = setup(space([en, de]));
    open.mockReturnValue({ afterClosed: () => of(false) });

    component.openDeleteDialog(de);

    expect(deleteLocale).not.toHaveBeenCalled();
  });

  it('openDeleteDialog() notifies an error on failure', () => {
    const { component, open, deleteLocale, error } = setup(space([en, de]));
    deleteLocale.mockReturnValue(throwError(() => new Error('boom')));
    open.mockReturnValue({ afterClosed: () => of(true) });

    component.openDeleteDialog(de);

    expect(error).toHaveBeenCalledWith("Locale 'German' can not be deleted.");
  });

  it('markAsFallback() notifies success', () => {
    const { component, markAsFallback, success } = setup(space([en, de]));

    component.markAsFallback(de);

    expect(markAsFallback).toHaveBeenCalledWith('space-1', de);
    expect(success).toHaveBeenCalledWith("Locale 'German' has been marked as fallback.");
  });

  it('markAsFallback() notifies an error on failure', () => {
    const { component, markAsFallback, error } = setup(space([en, de]));
    markAsFallback.mockReturnValue(throwError(() => new Error('boom')));

    component.markAsFallback(de);

    expect(error).toHaveBeenCalledWith("Locale 'German' can not be marked as fallback.");
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
