import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NotificationService } from '@shared/services/notification.service';
import { UserStore } from '@shared/stores/user.store';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { SetupComponent } from './setup.component';
import { SetupService } from './setup.service';

describe('SetupComponent', () => {
  let originalReload: typeof window.location.reload;

  beforeEach(() => {
    originalReload = window.location.reload;
    window.location.reload = vi.fn();
  });

  afterEach(() => {
    window.location.reload = originalReload;
    vi.useRealTimers();
  });

  function setup(initResult: 'success' | 'error') {
    const navigate = vi.fn().mockResolvedValue(true);
    const success = vi.fn();
    const error = vi.fn();
    const isAuthenticated = signal(false);
    const init = vi.fn().mockReturnValue(initResult === 'success' ? of(undefined) : throwError(() => new Error('setup failed')));

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { navigate } },
        { provide: NotificationService, useValue: { success, error } },
        { provide: UserStore, useValue: { isAuthenticated } },
      ],
    });
    TestBed.overrideComponent(SetupComponent, {
      set: { template: '<div></div>', providers: [{ provide: SetupService, useValue: { init } }] },
    });
    const fixture = TestBed.createComponent(SetupComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, navigate, success, error, isAuthenticated, init };
  }

  it('form is invalid when empty; requires a valid email and a 6+ character password', () => {
    const { component } = setup('success');
    expect(component.form.invalid).toBe(true);

    component.form.setValue({ email: 'admin@example.com', password: 'short', displayName: null });
    expect(component.form.invalid).toBe(true);

    component.form.setValue({ email: 'admin@example.com', password: 'longenough', displayName: null });
    expect(component.form.valid).toBe(true);
  });

  it('on successful setup, notifies success and counts down to a redirect', () => {
    vi.useFakeTimers();
    const { component, success, navigate, init } = setup('success');
    component.form.setValue({ email: 'admin@example.com', password: 'longenough', displayName: null });

    component.setup();

    expect(init).toHaveBeenCalledWith(component.form.value);
    expect(success).toHaveBeenCalled();
    expect(component.backCounter()).toBe(5);

    vi.advanceTimersByTime(6000);

    expect(component.backCounter()).toBe(-1);
    expect(navigate).toHaveBeenCalledWith(['features', 'welcome']);
  });

  it('on failed setup, notifies the error and still counts down to a redirect', () => {
    vi.useFakeTimers();
    const { component, error, navigate } = setup('error');
    component.form.setValue({ email: 'admin@example.com', password: 'longenough', displayName: null });

    component.setup();
    vi.advanceTimersByTime(6000);

    expect(error).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['features', 'welcome']);
  });

  it('redirects and reloads when the user becomes authenticated', async () => {
    const { fixture, isAuthenticated, navigate } = setup('success');

    isAuthenticated.set(true);
    fixture.detectChanges();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(navigate).toHaveBeenCalledWith(['features', 'welcome']);
    expect(window.location.reload).toHaveBeenCalled();
  });
});
