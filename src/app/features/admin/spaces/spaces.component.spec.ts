import { TestBed } from '@angular/core/testing';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { DIALOG_WIDTH_SM } from '@shared/components/dialog/dialog-width';
import { Space } from '@shared/models/space.model';
import { NotificationService } from '@shared/services/notification.service';
import { SpaceService } from '@shared/services/space.service';
import { SpaceTemplateService } from '@shared/services/space-template.service';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { SpacesComponent } from './spaces.component';

function space(overrides: Partial<Space> = {}): Space {
  return { id: 's1', name: 'Space 1', ...overrides } as Space;
}

describe('SpacesComponent', () => {
  function setup(spaces: Space[] = []) {
    const findAll = vi.fn().mockReturnValue(of(spaces));
    // `create` resolves to a DocumentReference: the component reads `ref.id` to apply a template.
    const create = vi.fn().mockReturnValue(of({ id: 'new-space' }));
    const update = vi.fn().mockReturnValue(of(undefined));
    const deleteSpace = vi.fn().mockReturnValue(of(undefined));
    const success = vi.fn();
    const error = vi.fn();
    const warning = vi.fn();
    const open = vi.fn();
    const apply = vi.fn().mockReturnValue(of(undefined));

    TestBed.overrideComponent(SpacesComponent, {
      set: { template: '<table llTableSort></table><ll-paginator [length]="0" />' },
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: SpaceService, useValue: { findAll, create, update, delete: deleteSpace } },
        { provide: NotificationService, useValue: { success, error, warning } },
        { provide: HlmDialogService, useValue: { open } },
        // Stubbed rather than real: the real one injects Firestore, which this spec has no use for.
        { provide: SpaceTemplateService, useValue: { apply } },
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
      findAll,
      create,
      update,
      deleteSpace,
      success,
      error,
      warning,
      open,
      apply,
      navigateWithAction,
    };
  }

  /** The dialog result the component reacts to. `undefined` means dismissed - Spartan closes that way on Cancel. */
  function closesWith(result: unknown) {
    return { closed$: of(result) };
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
      open.mockReturnValue(closesWith({ name: 'New Space', template: 'EMPTY' }));

      navigateWithAction('create');

      expect(create).toHaveBeenCalledWith({ name: 'New Space' });
      expect(success).toHaveBeenCalledWith('Space has been created.');
    });

    it('applies the chosen template to the created space', () => {
      const { open, apply, navigateWithAction } = setup();
      open.mockReturnValue(closesWith({ name: 'New Space', template: 'BLOG' }));

      navigateWithAction('create');

      expect(apply).toHaveBeenCalledWith('new-space', expect.objectContaining({ id: 'BLOG' }));
    });

    it('hands EMPTY to a template service that short-circuits on it', () => {
      const { open, apply, success, navigateWithAction } = setup();
      open.mockReturnValue(closesWith({ name: 'New Space', template: 'EMPTY' }));

      navigateWithAction('create');

      expect(apply).toHaveBeenCalledWith('new-space', expect.objectContaining({ id: 'EMPTY', schemas: [] }));
      expect(success).toHaveBeenCalledWith('Space has been created.');
    });

    it('reports the space as created when only the template failed', () => {
      // The space exists and is usable. Calling this a failed creation would invite the user to
      // retry a create that already succeeded.
      const { open, apply, warning, error, success, navigateWithAction } = setup();
      apply.mockReturnValue(throwError(() => new Error('permission-denied')));
      open.mockReturnValue(closesWith({ name: 'New Space', template: 'BLOG' }));

      navigateWithAction('create');

      expect(warning).toHaveBeenCalledWith('Space has been created, but the template could not be applied.');
      expect(error).not.toHaveBeenCalled();
      expect(success).not.toHaveBeenCalled();
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
      open.mockReturnValue(closesWith({ name: 'New Space', template: 'EMPTY' }));

      navigateWithAction('create');

      expect(error).toHaveBeenCalledWith('Space can not be created.');
    });
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
