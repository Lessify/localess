import { HttpParams } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { DIALOG_WIDTH_SM } from '@shared/components/dialog/dialog-width';
import { FirebaseImport, Page, Space } from '@localess/shared';
import { NotificationService } from '@core/services/notification.service';
import { SpaceService } from '@core/services/space.service';
import { Observable, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { FirebaseImportDialogComponent } from './firebase-import-dialog/firebase-import-dialog.component';
import { FirebaseImportsDialogComponent } from './firebase-imports-dialog/firebase-imports-dialog.component';
import { SpacesComponent } from './spaces.component';

function space(overrides: Partial<Space> = {}): Space {
  return { id: 's1', name: 'Space 1', ...overrides } as Space;
}

/** A space imported from Firebase, its run in `status` (the relation the admin list loads). */
function imported(status: FirebaseImport['status']): Space {
  return space({ firebaseImport: { status, sourceSpaceId: 'fb1' } as FirebaseImport });
}

describe('SpacesComponent', () => {
  function setup(spaces: Space[] = []) {
    const findAll = vi.fn((params: HttpParams): Observable<Page<Space>> =>
      of({ items: spaces, page: Number(params.get('page')), size: Number(params.get('size')), total: spaces.length }),
    );
    const create = vi.fn().mockReturnValue(of({ id: 'new-space' }));
    const update = vi.fn().mockReturnValue(of(undefined));
    const deleteSpace = vi.fn().mockReturnValue(of(undefined));
    const success = vi.fn();
    const error = vi.fn();
    const warning = vi.fn();
    const open = vi.fn();

    TestBed.overrideComponent(SpacesComponent, {
      set: { template: '<table llTableSort></table><ll-paginator [length]="0" />' },
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: SpaceService, useValue: { findAll, create, update, remove: deleteSpace } },
        { provide: NotificationService, useValue: { success, error, warning } },
        { provide: HlmDialogService, useValue: { open } },
      ],
    });
    const fixture = TestBed.createComponent(SpacesComponent);
    fixture.detectChanges();

    /**
     * Stands in for the router's `withComponentInputBinding()`, which sets every declared input on
     * each navigation - `undefined` for params that are absent.
     */
    const navigateWithAction = (action?: string) => {
      fixture.componentRef.setInput('action', action);
      fixture.detectChanges();
    };

    return {
      component: fixture.componentInstance,
      fixture,
      findAll,
      lastQuery: () => findAll.mock.calls.at(-1)![0].toString(),
      create,
      update,
      deleteSpace,
      success,
      error,
      warning,
      open,
      navigateWithAction,
    };
  }

  /** The dialog result the component reacts to. `undefined` means dismissed - Spartan closes that way on Cancel. */
  function closesWith(result: unknown) {
    return { closed$: of(result) };
  }

  it('loads the first page on init, in the server’s order, and shows the total', () => {
    const spaces = [space({ id: 's1' }), space({ id: 's2' })];
    const { component, lastQuery } = setup(spaces);

    expect(lastQuery()).toBe('page=0&size=20');
    expect(component.dataSource.filteredData()).toEqual(spaces);
    expect(component.total()).toBe(2);
    expect(component.isLoading()).toBe(false);
  });

  it('tells about a failed load and keeps answering the table: the next query change fetches again', () => {
    const { fixture, component, findAll, error } = setup();
    findAll.mockImplementationOnce(() => throwError(() => new Error('boom')));
    component.onFilterChange({ search: 'fails' });
    fixture.detectChanges();
    expect(error).toHaveBeenCalledWith('Spaces can not be loaded.');
    expect(component.isLoading()).toBe(false);

    component.onFilterChange({ search: 'works' });
    fixture.detectChanges();

    expect(findAll.mock.calls.at(-1)![0].toString()).toBe('page=0&size=20&search=works');
    expect(findAll).toHaveBeenCalledTimes(3);
  });

  it('asks the server for the search, from the first page', () => {
    const { fixture, component, lastQuery } = setup();
    component.list.page.set(1);

    component.onFilterChange({ search: 'space' });
    fixture.detectChanges();

    expect(lastQuery()).toBe('page=0&size=20&search=space');
  });

  it('asks the server for the sorted column and direction', () => {
    const { fixture, component, lastQuery } = setup();

    component.onSortChange({ active: 'updatedAt', direction: 'desc' });
    fixture.detectChanges();

    expect(lastQuery()).toBe('page=0&size=20&sort=updatedAt&direction=desc');
  });

  describe('?action=create', () => {
    it('opens the create dialog', () => {
      const { open, navigateWithAction } = setup();
      open.mockReturnValue(closesWith(undefined));

      navigateWithAction('create');

      expect(open).toHaveBeenCalledWith(expect.anything(), { contentClass: DIALOG_WIDTH_SM });
    });

    it('does not open the dialog without the param', () => {
      const { open } = setup();

      expect(open).not.toHaveBeenCalled();
    });

    it('ignores an action it does not know', () => {
      const { open, navigateWithAction } = setup();

      navigateWithAction('destroy-everything');

      expect(open).not.toHaveBeenCalled();
    });

    it('opens on a later navigation, not just the first', () => {
      // Angular reuses the component when only query params change, so ngOnInit runs once. The
      // sidebar CTA links to this same route, and reading the param once would leave it dead.
      const { open, navigateWithAction } = setup();
      open.mockReturnValue(closesWith(undefined));

      navigateWithAction(undefined);
      navigateWithAction('create');

      expect(open).toHaveBeenCalledTimes(1);
    });

    it('does not stack dialogs when the same action is re-bound', () => {
      // The router sets every input on every navigation, so 'create' can arrive again unchanged.
      const { open, navigateWithAction } = setup();
      open.mockReturnValue(closesWith(undefined));

      navigateWithAction('create');
      navigateWithAction('create');

      expect(open).toHaveBeenCalledTimes(1);
    });

    it('releases the action once the dialog closes', () => {
      // `currentAction` is a linkedSignal seeded from the input, so closing can reset it locally
      // without writing to the URL. Left set, the effect would hold the dialog permanently open.
      const { component, open, navigateWithAction } = setup();
      open.mockReturnValue(closesWith(undefined));

      navigateWithAction('create');

      expect(component.currentAction()).toBeUndefined();
    });
  });

  describe('creating a space', () => {
    it('opens the dialog from the Add button, without a navigation', () => {
      const { component, open } = setup();
      open.mockReturnValue(closesWith(undefined));

      component.openAddDialog();

      expect(open).toHaveBeenCalledWith(expect.anything(), { contentClass: DIALOG_WIDTH_SM });
    });

    it('creates the space and notifies success when confirmed', () => {
      const { open, create, success, navigateWithAction } = setup();
      open.mockReturnValue(closesWith({ name: 'New Space' }));

      navigateWithAction('create');

      expect(create).toHaveBeenCalledWith({ name: 'New Space' });
      expect(success).toHaveBeenCalledWith('Space has been created.');
    });

    it('creates the space from the chosen template in one request', () => {
      // The server applies the template in the creating transaction: there is no second step that could fail alone.
      const { open, create, success, warning, navigateWithAction } = setup();
      open.mockReturnValue(closesWith({ name: 'New Space', template: 'blog' }));

      navigateWithAction('create');

      expect(create).toHaveBeenCalledTimes(1);
      expect(create).toHaveBeenCalledWith({ name: 'New Space', template: 'blog' });
      expect(success).toHaveBeenCalledWith('Space has been created.');
      expect(warning).not.toHaveBeenCalled();
    });

    it('does not create anything when dismissed', () => {
      const { open, create, navigateWithAction } = setup();
      open.mockReturnValue(closesWith(undefined));

      navigateWithAction('create');

      expect(create).not.toHaveBeenCalled();
    });

    it('notifies an error when the space itself cannot be created', () => {
      const { open, create, error, navigateWithAction } = setup();
      create.mockReturnValue(throwError(() => new Error('boom')));
      open.mockReturnValue(closesWith({ name: 'New Space' }));

      navigateWithAction('create');

      expect(error).toHaveBeenCalledWith('Space can not be created.');
    });
  });

  it('opens the Firebase import dialog and the imports history', () => {
    const { component, open } = setup();
    open.mockReturnValue(closesWith(undefined));
    component.openFirebaseImport();
    expect(open).toHaveBeenCalledWith(FirebaseImportDialogComponent, expect.anything());
    component.openFirebaseImports();
    expect(open).toHaveBeenCalledWith(FirebaseImportsDialogComponent, expect.anything());
  });

  it('labels spaces being imported or whose import failed', () => {
    const { component } = setup();
    expect(component.importLabel(imported('RUNNING'))).toBe('Importing');
    expect(component.importLabel(imported('FAILED'))).toBe('Import failed');
    expect(component.importLabel(imported('FINISHED'))).toBeUndefined();
    expect(component.importLabel({} as Space)).toBeUndefined();
  });

  it('tells what to do with a space whose import failed', () => {
    const { component } = setup();
    expect(component.importHint(imported('FAILED'))).toBe('Delete the space and import it again');
    expect(component.importHint(imported('RUNNING'))).toBe('It opens once the import has finished');
    expect(component.importHint(imported('FINISHED'))).toBeUndefined();
    expect(component.importHint({} as Space)).toBeUndefined();
  });

  it('openEditDialog() updates the space and notifies success when confirmed', () => {
    const { component, open, update, success } = setup();
    open.mockReturnValue(closesWith({ name: 'Renamed' }));

    component.openEditDialog(space({ id: 's1' }));

    expect(update).toHaveBeenCalledWith('s1', { name: 'Renamed' });
    expect(success).toHaveBeenCalledWith('Space has been updated.');
  });

  it('openEditDialog() notifies an error on failure', () => {
    const { component, open, update, error } = setup();
    update.mockReturnValue(throwError(() => new Error('boom')));
    open.mockReturnValue(closesWith({ name: 'Renamed' }));

    component.openEditDialog(space({ id: 's1' }));

    expect(error).toHaveBeenCalledWith('Space can not be updated.');
  });

  it('openDeleteDialog() deletes and notifies success when confirmed', () => {
    const { component, open, deleteSpace, success } = setup();
    open.mockReturnValue(closesWith(true));

    component.openDeleteDialog(space({ id: 's1', name: 'Space 1' }));

    expect(deleteSpace).toHaveBeenCalledWith('s1');
    expect(success).toHaveBeenCalledWith("Space 'Space 1' has been deleted.");
  });

  it('openDeleteDialog() does not delete when cancelled', () => {
    const { component, open, deleteSpace } = setup();
    open.mockReturnValue(closesWith(undefined));

    component.openDeleteDialog(space({ id: 's1' }));

    expect(deleteSpace).not.toHaveBeenCalled();
  });

  it('openDeleteDialog() notifies an error on failure', () => {
    const { component, open, deleteSpace, error } = setup();
    deleteSpace.mockReturnValue(throwError(() => new Error('boom')));
    open.mockReturnValue(closesWith(true));

    component.openDeleteDialog(space({ id: 's1', name: 'Space 1' }));

    expect(error).toHaveBeenCalledWith("Space 'Space 1' can not be deleted.");
  });

  it('copied() notifies success', () => {
    const { component, success } = setup();

    component.copied();

    expect(success).toHaveBeenCalledWith('Space ID copied to clipboard.');
  });
});
