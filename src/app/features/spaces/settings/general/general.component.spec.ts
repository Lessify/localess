import { TestBed } from '@angular/core/testing';
import { Space } from '@shared/models/space.model';
import { NotificationService } from '@shared/services/notification.service';
import { SpaceService } from '@shared/services/space.service';
import { SpaceStore } from '@shared/stores/space.store';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { GeneralComponent } from './general.component';

function space(overrides: Partial<Space> = {}): Space {
  return { id: 'space-1', name: 'Space 1', locales: [], localeFallback: { id: 'en', name: 'English' } as Space['localeFallback'], ...overrides } as Space;
}

describe('GeneralComponent', () => {
  function setup(selectedSpace: Space | undefined, selectedSpaceId = 'space-1') {
    const update = vi.fn().mockReturnValue(of(undefined));
    const success = vi.fn();
    const error = vi.fn();

    TestBed.overrideComponent(GeneralComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: SpaceService, useValue: { update } },
        { provide: NotificationService, useValue: { success, error } },
        { provide: SpaceStore, useValue: { selectedSpace: signal(selectedSpace), selectedSpaceId: signal(selectedSpaceId) } },
      ],
    });
    const fixture = TestBed.createComponent(GeneralComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, update, success, error };
  }

  it('starts loading until a space is selected', () => {
    const { component } = setup(undefined);

    expect(component.isLoading()).toBe(true);
  });

  it('patches the form once the selected space arrives', () => {
    const { component } = setup(space({ name: 'My Space' }));

    expect(component.form.value.name).toBe('My Space');
    expect(component.isLoading()).toBe(false);
  });

  it('save() updates the space and notifies success', () => {
    const { component, update, success } = setup(space());
    component.form.setValue({ name: 'Renamed' });

    component.save();

    expect(update).toHaveBeenCalledWith('space-1', { name: 'Renamed' });
    expect(success).toHaveBeenCalledWith('Space has been updated.');
  });

  it('save() notifies an error on failure', () => {
    const { component, update, error } = setup(space());
    update.mockReturnValue(throwError(() => new Error('boom')));

    component.save();

    expect(error).toHaveBeenCalledWith('Space can not be updated.');
  });

  it('copied() notifies success', () => {
    const { component, success } = setup(space());

    component.copied();

    expect(success).toHaveBeenCalledWith('Space ID copied to clipboard.');
  });
});
