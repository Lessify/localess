import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Space } from '@shared/models/space.model';
import { NotificationService } from '@shared/services/notification.service';
import { SpaceService } from '@shared/services/space.service';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { SpacesComponent } from './spaces.component';

function space(overrides: Partial<Space> = {}): Space {
  return { id: 's1', name: 'Space 1', ...overrides } as Space;
}

describe('SpacesComponent', () => {
  function setup(spaces: Space[] = []) {
    const findAll = vi.fn().mockReturnValue(of(spaces));
    const create = vi.fn().mockReturnValue(of(undefined));
    const update = vi.fn().mockReturnValue(of(undefined));
    const deleteSpace = vi.fn().mockReturnValue(of(undefined));
    const success = vi.fn();
    const error = vi.fn();
    const open = vi.fn();

    TestBed.overrideComponent(SpacesComponent, {
      set: { template: '<table llTableSort></table><ll-paginator [length]="0" />' },
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: SpaceService, useValue: { findAll, create, update, delete: deleteSpace } },
        { provide: NotificationService, useValue: { success, error } },
        { provide: MatDialog, useValue: { open } },
      ],
    });
    const fixture = TestBed.createComponent(SpacesComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, findAll, create, update, deleteSpace, success, error, open };
  }

  it('loads spaces on init', () => {
    const spaces = [space({ id: 's1' }), space({ id: 's2' })];
    const { component, findAll } = setup(spaces);

    expect(findAll).toHaveBeenCalled();
    expect(component.dataSource.filteredData()).toEqual(spaces);
    expect(component.isLoading()).toBe(false);
  });

  it('onFilterChange() serializes the filter value onto the data source', () => {
    const { component } = setup();

    component.onFilterChange({ search: 'space' });

    expect(component.dataSource.filter).toBe(JSON.stringify({ search: 'space' }));
  });

  it('openAddDialog() creates the space and notifies success when confirmed', () => {
    const { component, open, create, success } = setup();
    open.mockReturnValue({ afterClosed: () => of({ name: 'New Space' }) });

    component.openAddDialog();

    expect(create).toHaveBeenCalledWith({ name: 'New Space' });
    expect(success).toHaveBeenCalledWith('Space has been created.');
  });

  it('openAddDialog() does nothing when dismissed', () => {
    const { component, open, create } = setup();
    open.mockReturnValue({ afterClosed: () => of(undefined) });

    component.openAddDialog();

    expect(create).not.toHaveBeenCalled();
  });

  it('openAddDialog() notifies an error on failure', () => {
    const { component, open, create, error } = setup();
    create.mockReturnValue(throwError(() => new Error('boom')));
    open.mockReturnValue({ afterClosed: () => of({ name: 'New Space' }) });

    component.openAddDialog();

    expect(error).toHaveBeenCalledWith('Space can not be created.');
  });

  it('openEditDialog() updates the space and notifies success when confirmed', () => {
    const { component, open, update, success } = setup();
    open.mockReturnValue({ afterClosed: () => of({ name: 'Renamed' }) });

    component.openEditDialog(space({ id: 's1' }));

    expect(update).toHaveBeenCalledWith('s1', { name: 'Renamed' });
    expect(success).toHaveBeenCalledWith('Space has been updated.');
  });

  it('openEditDialog() notifies an error on failure', () => {
    const { component, open, update, error } = setup();
    update.mockReturnValue(throwError(() => new Error('boom')));
    open.mockReturnValue({ afterClosed: () => of({ name: 'Renamed' }) });

    component.openEditDialog(space({ id: 's1' }));

    expect(error).toHaveBeenCalledWith('Space can not be updated.');
  });

  it('openDeleteDialog() deletes and notifies success when confirmed', () => {
    const { component, open, deleteSpace, success } = setup();
    open.mockReturnValue({ afterClosed: () => of(true) });

    component.openDeleteDialog(space({ id: 's1', name: 'Space 1' }));

    expect(deleteSpace).toHaveBeenCalledWith('s1');
    expect(success).toHaveBeenCalledWith("Space 'Space 1' has been deleted.");
  });

  it('openDeleteDialog() does not delete when cancelled', () => {
    const { component, open, deleteSpace } = setup();
    open.mockReturnValue({ afterClosed: () => of(false) });

    component.openDeleteDialog(space({ id: 's1' }));

    expect(deleteSpace).not.toHaveBeenCalled();
  });

  it('openDeleteDialog() notifies an error on failure', () => {
    const { component, open, deleteSpace, error } = setup();
    deleteSpace.mockReturnValue(throwError(() => new Error('boom')));
    open.mockReturnValue({ afterClosed: () => of(true) });

    component.openDeleteDialog(space({ id: 's1', name: 'Space 1' }));

    expect(error).toHaveBeenCalledWith("Space 'Space 1' can not be deleted.");
  });

  it('copied() notifies success', () => {
    const { component, success } = setup();

    component.copied();

    expect(success).toHaveBeenCalledWith('Space ID copied to clipboard.');
  });
});
