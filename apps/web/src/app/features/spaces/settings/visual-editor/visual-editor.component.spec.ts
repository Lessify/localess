import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Space, SpaceEnvironment } from '@localess/shared';
import { NotificationService } from '@core/services/notification.service';
import { SpaceService } from '@core/services/space.service';
import { SpaceStore } from '@core/stores/space.store';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { VisualEditorComponent } from './visual-editor.component';

const prod: SpaceEnvironment = { id: 'e1', name: 'prod', url: 'https://prod.example.com/' };
const staging: SpaceEnvironment = { id: 'e2', name: 'staging', url: 'https://staging.example.com/' };
const twin: SpaceEnvironment = { id: 'e3', name: 'prod', url: 'https://twin.example.com/' };

function space(environments: SpaceEnvironment[]): Space {
  return { id: 'space-1', name: 'Space 1', locales: [], environments } as unknown as Space;
}

const dropOf = (previousIndex: number, currentIndex: number) => ({ previousIndex, currentIndex }) as CdkDragDrop<SpaceEnvironment[]>;

describe('VisualEditorComponent', () => {
  function setup(selectedSpace: Space | undefined) {
    const spaceService = {
      createEnvironment: vi.fn().mockReturnValue(of(undefined)),
      updateEnvironment: vi.fn().mockReturnValue(of(undefined)),
      deleteEnvironment: vi.fn().mockReturnValue(of(undefined)),
      reorderEnvironments: vi.fn().mockReturnValue(of(undefined)),
    };
    const success = vi.fn();
    const error = vi.fn();
    const openDialog = vi.fn();
    const selected: WritableSignal<Space | undefined> = signal(selectedSpace);

    TestBed.overrideComponent(VisualEditorComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: SpaceService, useValue: spaceService },
        { provide: NotificationService, useValue: { success, error } },
        { provide: HlmDialogService, useValue: { open: openDialog } },
        { provide: SpaceStore, useValue: { selectedSpace: selected, selectedSpaceId: signal('space-1') } },
      ],
    });
    const fixture = TestBed.createComponent(VisualEditorComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, spaceService, success, error, openDialog, selected };
  }

  it('is loading until a space is selected', () => {
    const { component } = setup(undefined);

    expect(component.isLoading()).toBe(true);
    expect(component.environments()).toEqual([]);
  });

  it("lists the space's environments, names repeating", () => {
    const { component, selected } = setup(space([prod, twin]));

    expect(component.isLoading()).toBe(false);
    expect(component.environments()).toEqual([prod, twin]);

    selected.set(space([twin]));
    expect(component.environments()).toEqual([twin]);
  });

  it('exampleUrl() shows what an environment URL opens for the sample document', () => {
    const { component } = setup(space([]));

    expect(component.exampleUrl('https://site.com/')).toBe('https://site.com/de/blog/hello');
    expect(component.exampleUrl('https://site.com/{locale/}news/{slug}/')).toBe('https://site.com/de/news/hello/');
  });

  it('openAddDialog() creates the environment from the dialog', () => {
    const { component, openDialog, spaceService, success } = setup(space([]));
    openDialog.mockReturnValue({ closed$: of({ name: 'Prod', url: 'https://prod.example.com/' }) });

    component.openAddDialog();

    expect(openDialog.mock.calls[0][1].context).toBeUndefined();
    expect(spaceService.createEnvironment).toHaveBeenCalledWith('space-1', { name: 'Prod', url: 'https://prod.example.com/' });
    expect(success).toHaveBeenCalledWith('Environment has been added.');
  });

  it('openAddDialog() does nothing when dismissed, and reports a failure', () => {
    const { component, openDialog, spaceService, error } = setup(space([]));
    openDialog.mockReturnValue({ closed$: of(undefined) });
    component.openAddDialog();
    expect(spaceService.createEnvironment).not.toHaveBeenCalled();

    spaceService.createEnvironment.mockReturnValue(throwError(() => new Error('boom')));
    openDialog.mockReturnValue({ closed$: of({ name: 'Prod', url: 'https://prod.example.com/' }) });
    component.openAddDialog();
    expect(error).toHaveBeenCalledWith('Environment can not be added.');
  });

  it('openEditDialog() passes the environment and updates it by id', () => {
    const { component, openDialog, spaceService, success } = setup(space([prod, twin]));
    openDialog.mockReturnValue({ closed$: of({ name: 'Twin', url: 'https://twin.example.com/' }) });

    component.openEditDialog(twin);

    expect(openDialog.mock.calls[0][1].context).toEqual({ name: 'prod', url: 'https://twin.example.com/' });
    expect(spaceService.updateEnvironment).toHaveBeenCalledWith('space-1', 'e3', { name: 'Twin', url: 'https://twin.example.com/' });
    expect(success).toHaveBeenCalledWith("Environment 'prod' has been updated.");
  });

  it('openDeleteDialog() deletes by id once confirmed', () => {
    const { component, openDialog, spaceService, success } = setup(space([prod, staging]));
    openDialog.mockReturnValue({ closed$: of(true) });

    component.openDeleteDialog(staging);

    expect(spaceService.deleteEnvironment).toHaveBeenCalledWith('space-1', 'e2');
    expect(success).toHaveBeenCalledWith("Environment 'staging' has been deleted.");
  });

  it('openDeleteDialog() keeps the environment when cancelled', () => {
    const { component, openDialog, spaceService } = setup(space([prod, staging]));
    openDialog.mockReturnValue({ closed$: of(undefined) });

    component.openDeleteDialog(staging);

    expect(spaceService.deleteEnvironment).not.toHaveBeenCalled();
  });

  it('drop() reorders at once and sends the new order', () => {
    const { component, spaceService } = setup(space([prod, staging, twin]));

    component.drop(dropOf(2, 0));

    expect(component.environments()).toEqual([twin, prod, staging]);
    expect(spaceService.reorderEnvironments).toHaveBeenCalledWith('space-1', ['e3', 'e1', 'e2']);
  });

  it('drop() on the same place sends nothing', () => {
    const { component, spaceService } = setup(space([prod, staging]));

    component.drop(dropOf(1, 1));

    expect(spaceService.reorderEnvironments).not.toHaveBeenCalled();
  });

  it('drop() puts the old order back when the server refuses', () => {
    const { component, spaceService, error } = setup(space([prod, staging]));
    spaceService.reorderEnvironments.mockReturnValue(throwError(() => new Error('boom')));

    component.drop(dropOf(0, 1));

    expect(component.environments()).toEqual([prod, staging]);
    expect(error).toHaveBeenCalledWith('Environments can not be reordered.');
  });
});
