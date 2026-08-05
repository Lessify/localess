import { TestBed } from '@angular/core/testing';
import { Space, SpaceEnvironment } from '@shared/models/space.model';
import { NotificationService } from '@shared/services/notification.service';
import { PlatformService } from '@shared/services/platform.service';
import { SpaceService } from '@shared/services/space.service';
import { SpaceStore } from '@shared/stores/space.store';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { VisualEditorComponent } from './visual-editor.component';

function space(environments?: SpaceEnvironment[]): Space {
  return {
    id: 'space-1',
    name: 'Space 1',
    locales: [],
    localeFallback: { id: 'en', name: 'English' } as Space['localeFallback'],
    environments,
  } as unknown as Space;
}

describe('VisualEditorComponent', () => {
  function setup(selectedSpace: Space | undefined, isActionSave = false) {
    const updateEnvironments = vi.fn().mockReturnValue(of(undefined));
    const success = vi.fn();
    const error = vi.fn();

    TestBed.overrideComponent(VisualEditorComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: SpaceService, useValue: { updateEnvironments } },
        { provide: NotificationService, useValue: { success, error } },
        { provide: PlatformService, useValue: { isActionSave: vi.fn().mockReturnValue(isActionSave) } },
        { provide: SpaceStore, useValue: { selectedSpace: signal(selectedSpace), selectedSpaceId: signal('space-1') } },
      ],
    });
    const fixture = TestBed.createComponent(VisualEditorComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, updateEnvironments, success, error };
  }

  it('starts loading until a space is selected', () => {
    const { component } = setup(undefined);

    expect(component.isLoading()).toBe(true);
    expect(component.environments.length).toBe(0);
  });

  it('populates one form group per environment once the space arrives', () => {
    const { component } = setup(space([{ name: 'prod', url: 'https://prod' }]));

    expect(component.isLoading()).toBe(false);
    expect(component.environments.length).toBe(1);
    expect(component.environments.at(0).value).toEqual({ name: 'prod', url: 'https://prod' });
  });

  it('addEnvironment() appends an empty group by default', () => {
    const { component } = setup(space([]));

    component.addEnvironment();

    expect(component.environments.length).toBe(1);
    expect(component.environments.at(0).value).toEqual({ name: '', url: '' });
  });

  it('removeEnvironment() removes the group at the given index', () => {
    const { component } = setup(space([{ name: 'a', url: 'https://a' }, { name: 'b', url: 'https://b' }]));

    component.removeEnvironment(0);

    expect(component.environments.length).toBe(1);
    expect(component.environments.at(0).value.name).toBe('b');
  });

  it('environmentDropDrop() moves an environment from one index to another', () => {
    const { component } = setup(space([{ name: 'a', url: 'https://a' }, { name: 'b', url: 'https://b' }]));

    component.environmentDropDrop({ previousIndex: 0, currentIndex: 1 } as never);

    expect(component.environments.at(0).value.name).toBe('b');
    expect(component.environments.at(1).value.name).toBe('a');
  });

  it('environmentDropDrop() no-ops when the index is unchanged', () => {
    const { component } = setup(space([{ name: 'a', url: 'https://a' }]));

    component.environmentDropDrop({ previousIndex: 0, currentIndex: 0 } as never);

    expect(component.environments.at(0).value.name).toBe('a');
  });

  it('save() updates the environments and notifies success', () => {
    const { component, updateEnvironments, success } = setup(space([]));
    component.addEnvironment({ name: 'prod', url: 'https://prod' });

    component.save();

    expect(updateEnvironments).toHaveBeenCalledWith('space-1', [{ name: 'prod', url: 'https://prod' }]);
    expect(success).toHaveBeenCalledWith('Space has been updated.');
    expect(component.isSaveLoading()).toBe(false);
  });

  it('save() notifies an error on failure', () => {
    const { component, updateEnvironments, error } = setup(space([]));
    updateEnvironments.mockReturnValue(throwError(() => new Error('boom')));

    component.save();

    expect(error).toHaveBeenCalledWith('Space can not be updated.');
  });

  it('captureKeyboard() saves and prevents default on Ctrl/Cmd+S', () => {
    const { component, updateEnvironments } = setup(space([]), true);
    const event = { preventDefault: vi.fn() } as unknown as KeyboardEvent;

    component.captureKeyboard(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(updateEnvironments).toHaveBeenCalled();
  });

  it('captureKeyboard() does nothing for other key combinations', () => {
    const { component, updateEnvironments } = setup(space([]), false);
    const event = { preventDefault: vi.fn() } as unknown as KeyboardEvent;

    component.captureKeyboard(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(updateEnvironments).not.toHaveBeenCalled();
  });
});
