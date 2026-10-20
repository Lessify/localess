import { computed, signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Page, Space, SpaceEnvironment } from '@localess/shared';
import { NotificationService } from '@core/services/notification.service';
import { SpaceEnvironmentService } from '@core/services/space-environment.service';
import { SpaceStore } from '@core/stores/space.store';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { VisualEditorComponent } from './visual-editor.component';

/** An environment of the space, as `GET /spaces/:id/environments` answers it. */
const env = (id: string, name: string, url: string, position = 0): SpaceEnvironment => ({
  id,
  spaceId: 'space-1',
  name,
  url,
  position,
  createdAt: '',
  updatedAt: '',
});
const prod = env('e1', 'prod', 'https://prod.example.com/');
const staging = env('e2', 'staging', 'https://staging.example.com/');
const twin = env('e3', 'prod', 'https://twin.example.com/');

/** One page holding `environments`. */
const pageOf = (environments: SpaceEnvironment[]): Page<SpaceEnvironment> => ({ items: environments, page: 0, size: 20, total: environments.length });

/** The selected space, carrying here the environments the store holds for it (every one, in the space's order). */
function space(environments: SpaceEnvironment[]): Space {
  return { id: 'space-1', name: 'Space 1', environments } as unknown as Space;
}

describe('VisualEditorComponent', () => {
  function setup(selectedSpace: Space | undefined) {
    const selected: WritableSignal<Space | undefined> = signal(selectedSpace);
    const environments = computed(() => (selected() as { environments?: SpaceEnvironment[] } | undefined)?.environments ?? []);
    const spaceEnvironmentService = {
      findAll: vi.fn().mockReturnValue(of(pageOf(environments()))),
      create: vi.fn().mockReturnValue(of(undefined)),
      update: vi.fn().mockReturnValue(of(undefined)),
      remove: vi.fn().mockReturnValue(of(undefined)),
      move: vi.fn().mockReturnValue(of(undefined)),
    };
    const success = vi.fn();
    const error = vi.fn();
    const openDialog = vi.fn();

    TestBed.overrideComponent(VisualEditorComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: SpaceEnvironmentService, useValue: spaceEnvironmentService },
        { provide: NotificationService, useValue: { success, error } },
        { provide: HlmDialogService, useValue: { open: openDialog } },
        {
          provide: SpaceStore,
          useValue: { selectedSpace: selected, selectedSpaceId: computed(() => selected()?.id), environments },
        },
      ],
    });
    const fixture = TestBed.createComponent(VisualEditorComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, fixture, spaceEnvironmentService, success, error, openDialog, selected };
  }

  it('loads nothing until a space is selected', () => {
    const { component, spaceEnvironmentService } = setup(undefined);

    expect(component.isLoading()).toBe(true);
    expect(spaceEnvironmentService.findAll).not.toHaveBeenCalled();
  });

  it("loads the first page of the space's environments, names repeating", () => {
    const { component, spaceEnvironmentService } = setup(space([prod, twin]));

    expect(spaceEnvironmentService.findAll.mock.lastCall![0]).toBe('space-1');
    expect(spaceEnvironmentService.findAll.mock.lastCall![1].toString()).toBe('page=0&size=20');
    expect(component.dataSource.filteredData()).toEqual([prod, twin]);
    expect(component.total()).toBe(2);
    expect(component.isLoading()).toBe(false);
  });

  it('onFilterChange() searches on the server from the first page', () => {
    const { component, fixture, spaceEnvironmentService } = setup(space([prod, staging]));
    component.list.page.set(1);
    fixture.detectChanges();

    component.onFilterChange({ search: ' stag ' });
    fixture.detectChanges();

    expect(spaceEnvironmentService.findAll.mock.lastCall![1].toString()).toBe('page=0&size=20&search=stag');
  });

  it('onSortChange() sorts on the server; cleared, back to the space order', () => {
    const { component, fixture, spaceEnvironmentService } = setup(space([prod, staging]));

    component.onSortChange({ active: 'url', direction: 'desc' });
    fixture.detectChanges();
    expect(spaceEnvironmentService.findAll.mock.lastCall![1].toString()).toBe('page=0&size=20&sort=url&direction=desc');

    component.onSortChange({ active: 'url', direction: '' });
    fixture.detectChanges();
    expect(spaceEnvironmentService.findAll.mock.lastCall![1].toString()).toBe('page=0&size=20');
  });

  it('notifies a failed load, and loads again on the next query change', () => {
    const { component, fixture, spaceEnvironmentService, error, selected } = setup(undefined);
    spaceEnvironmentService.findAll.mockReturnValue(of(pageOf([prod]))).mockReturnValueOnce(throwError(() => new Error('boom')));
    // The space arrives: its first load fails.
    selected.set(space([prod]));
    fixture.detectChanges();
    expect(error).toHaveBeenCalledWith('Environments can not be loaded.');

    component.onFilterChange({ search: 'prod' });
    fixture.detectChanges();
    expect(component.dataSource.filteredData()).toEqual([prod]);
  });

  it("marks the first environment in the space's order as the default, whatever the page shows", () => {
    const { component, selected } = setup(space([prod, staging]));
    expect(component.defaultEnvironmentId()).toBe('e1');

    selected.set(space([staging, prod]));
    expect(component.defaultEnvironmentId()).toBe('e2');
  });

  it('exampleUrl() shows what an environment URL opens for the sample document', () => {
    const { component } = setup(space([]));

    expect(component.exampleUrl('https://site.com/')).toBe('https://site.com/de/blog/hello');
    expect(component.exampleUrl('https://site.com/{locale/}news/{slug}/')).toBe('https://site.com/de/news/hello/');
  });

  it('openAddDialog() creates the environment from the dialog', () => {
    const { component, openDialog, spaceEnvironmentService, success } = setup(space([]));
    openDialog.mockReturnValue({ closed$: of({ name: 'Prod', url: 'https://prod.example.com/' }) });

    component.openAddDialog();

    expect(openDialog.mock.calls[0][1].context).toBeUndefined();
    expect(spaceEnvironmentService.create).toHaveBeenCalledWith('space-1', { name: 'Prod', url: 'https://prod.example.com/' });
    expect(success).toHaveBeenCalledWith('Environment has been added.');
  });

  it('openAddDialog() does nothing when dismissed, and reports a failure', () => {
    const { component, openDialog, spaceEnvironmentService, error } = setup(space([]));
    openDialog.mockReturnValue({ closed$: of(undefined) });
    component.openAddDialog();
    expect(spaceEnvironmentService.create).not.toHaveBeenCalled();

    spaceEnvironmentService.create.mockReturnValue(throwError(() => new Error('boom')));
    openDialog.mockReturnValue({ closed$: of({ name: 'Prod', url: 'https://prod.example.com/' }) });
    component.openAddDialog();
    expect(error).toHaveBeenCalledWith('Environment can not be added.');
  });

  it('openEditDialog() passes the environment and updates it by id', () => {
    const { component, openDialog, spaceEnvironmentService, success } = setup(space([prod, twin]));
    openDialog.mockReturnValue({ closed$: of({ name: 'Twin', url: 'https://twin.example.com/' }) });

    component.openEditDialog(twin);

    expect(openDialog.mock.calls[0][1].context).toEqual({ name: 'prod', url: 'https://twin.example.com/' });
    expect(spaceEnvironmentService.update).toHaveBeenCalledWith('space-1', 'e3', { name: 'Twin', url: 'https://twin.example.com/' });
    expect(success).toHaveBeenCalledWith("Environment 'Twin' has been updated.");
  });

  it('openDeleteDialog() deletes by id once confirmed', () => {
    const { component, openDialog, spaceEnvironmentService, success } = setup(space([prod, staging]));
    openDialog.mockReturnValue({ closed$: of(true) });

    component.openDeleteDialog(staging);

    expect(spaceEnvironmentService.remove).toHaveBeenCalledWith('space-1', 'e2');
    expect(success).toHaveBeenCalledWith("Environment 'staging' has been deleted.");
  });

  it('openDeleteDialog() keeps the environment when cancelled', () => {
    const { component, openDialog, spaceEnvironmentService } = setup(space([prod, staging]));
    openDialog.mockReturnValue({ closed$: of(undefined) });

    component.openDeleteDialog(staging);

    expect(spaceEnvironmentService.remove).not.toHaveBeenCalled();
  });

  it("move() takes an environment one place up or down in the space's order", () => {
    const { component, spaceEnvironmentService } = setup(space([prod, staging, twin]));

    component.move(twin, -1);
    expect(spaceEnvironmentService.move).toHaveBeenLastCalledWith('space-1', 'e3', 1);

    component.move(prod, 1);
    expect(spaceEnvironmentService.move).toHaveBeenLastCalledWith('space-1', 'e1', 1);
  });

  it('canMove() is false at the ends, and move() then sends nothing', () => {
    const { component, spaceEnvironmentService } = setup(space([prod, staging]));

    expect(component.canMove(prod, -1)).toBe(false);
    expect(component.canMove(prod, 1)).toBe(true);
    expect(component.canMove(staging, 1)).toBe(false);
    component.move(staging, 1);

    expect(spaceEnvironmentService.move).not.toHaveBeenCalled();
  });

  it('move() notifies an error on failure', () => {
    const { component, spaceEnvironmentService, error } = setup(space([prod, staging]));
    spaceEnvironmentService.move.mockReturnValue(throwError(() => new Error('boom')));

    component.move(staging, -1);

    expect(error).toHaveBeenCalledWith("Environment 'staging' can not be moved.");
  });
});
