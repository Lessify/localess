import { TestBed } from '@angular/core/testing';
import { AppSettings } from '@shared/models/settings.model';
import { NotificationService } from '@shared/services/notification.service';
import { SettingsService } from '@shared/services/settings.service';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { UiComponent } from './ui.component';

describe('UiComponent', () => {
  function setup(settings: AppSettings) {
    const find = vi.fn().mockReturnValue(of(settings));
    const updateUi = vi.fn().mockReturnValue(of(undefined));
    const success = vi.fn();
    const error = vi.fn();

    TestBed.overrideComponent(UiComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: SettingsService, useValue: { find, updateUi } },
        { provide: NotificationService, useValue: { success, error } },
      ],
    });
    const fixture = TestBed.createComponent(UiComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, updateUi, success, error };
  }

  it('patches the form when settings already have a ui block', () => {
    const { component } = setup({ ui: { text: 'Welcome', color: 'primary' } } as AppSettings);

    expect(component.form.value).toEqual({ text: 'Welcome', color: 'primary' });
    expect(component.isLoading()).toBe(false);
  });

  it('leaves the form at its defaults when settings have no ui block', () => {
    const { component } = setup({} as AppSettings);

    expect(component.form.value).toEqual({ text: null, color: null });
    expect(component.isLoading()).toBe(false);
  });

  it('save() updates the settings and notifies success', () => {
    const { component, updateUi, success } = setup({} as AppSettings);
    component.form.setValue({ text: 'Hi', color: 'secondary' });

    component.save();

    expect(updateUi).toHaveBeenCalledWith({ text: 'Hi', color: 'secondary' });
    expect(success).toHaveBeenCalledWith('Settings UI has been updated.');
  });

  it('save() notifies an error on failure', () => {
    const { component, updateUi, error } = setup({} as AppSettings);
    updateUi.mockReturnValue(throwError(() => new Error('boom')));

    component.save();

    expect(error).toHaveBeenCalledWith('Settings UI can not be updated.');
  });

  it('colorToString() capitalizes the color name', () => {
    const { component } = setup({} as AppSettings);

    expect(component.colorToString('primary')).toBe('Primary');
  });
});
