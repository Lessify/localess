import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Auth, signInWithEmailAndPassword, signInWithPopup, signOut } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { UserStore } from '@shared/stores/user.store';
import { vi } from 'vitest';

import { environment } from '../../../environments/environment';
import { LoginComponent } from './login.component';

// @angular/fire/auth is mocked globally in src/test-setup.ts.
describe('LoginComponent', () => {
  let originalReload: typeof window.location.reload;

  beforeEach(() => {
    localStorage.clear();
    originalReload = window.location.reload;
    window.location.reload = vi.fn();
  });

  afterEach(() => {
    window.location.reload = originalReload;
    vi.clearAllMocks();
  });

  function setup() {
    const navigate = vi.fn().mockResolvedValue(true);
    const setAuthenticated = vi.fn();
    const isAuthenticated = signal(false);

    TestBed.configureTestingModule({
      providers: [
        { provide: Auth, useValue: {} },
        { provide: Router, useValue: { navigate } },
        { provide: UserStore, useValue: { isAuthenticated, setAuthenticated } },
      ],
    });
    TestBed.overrideComponent(LoginComponent, { set: { template: '<div></div>' } });
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, navigate, setAuthenticated, isAuthenticated };
  }

  it('reflects the real environment auth-provider configuration', () => {
    const { component } = setup();
    expect(component.isGoogleAuthEnabled).toBe(environment.auth.providers.includes('GOOGLE'));
    expect(component.isMicrosoftAuthEnabled).toBe(environment.auth.providers.includes('MICROSOFT'));
  });

  it('form is invalid when empty; valid once both fields have at least 2 characters', () => {
    const { component } = setup();
    expect(component.form.invalid).toBe(true);

    component.form.setValue({ email: 'ab', password: 'cd' });
    expect(component.form.valid).toBe(true);
  });

  it('loginWithEmailAndPassword no-ops when the form has no email/password', async () => {
    const { component, setAuthenticated } = setup();

    await expect(component.loginWithEmailAndPassword()).resolves.toBeUndefined();

    expect(signInWithEmailAndPassword).not.toHaveBeenCalled();
    expect(setAuthenticated).not.toHaveBeenCalled();
    expect(component.hasAuthError()).toBe(false);
  });

  it('loginWithEmailAndPassword signs in and marks the user authenticated on success', async () => {
    const { component, setAuthenticated } = setup();
    component.form.setValue({ email: 'user@example.com', password: 'secret' });
    vi.mocked(signInWithEmailAndPassword).mockResolvedValue({} as never);

    await component.loginWithEmailAndPassword();

    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(component.auth, 'user@example.com', 'secret');
    expect(setAuthenticated).toHaveBeenCalledWith(true);
    expect(component.hasAuthError()).toBe(false);
  });

  it('loginWithEmailAndPassword sets hasAuthError on a Firebase auth error', async () => {
    const { component, setAuthenticated } = setup();
    component.form.setValue({ email: 'user@example.com', password: 'wrong' });
    vi.mocked(signInWithEmailAndPassword).mockRejectedValue({ code: 'auth/wrong-password' });

    await component.loginWithEmailAndPassword();

    expect(setAuthenticated).not.toHaveBeenCalled();
    expect(component.hasAuthError()).toBe(true);
  });

  it('loginWithEmailAndPassword swallows non-Firebase errors without setting hasAuthError', async () => {
    const { component, setAuthenticated } = setup();
    component.form.setValue({ email: 'user@example.com', password: 'wrong' });
    vi.mocked(signInWithEmailAndPassword).mockRejectedValue(new Error('network down'));

    await component.loginWithEmailAndPassword();

    expect(setAuthenticated).not.toHaveBeenCalled();
    expect(component.hasAuthError()).toBe(false);
  });

  it('loginWithGoogle signs in via popup and marks the user authenticated', async () => {
    const { component, setAuthenticated } = setup();
    vi.mocked(signInWithPopup).mockResolvedValue({} as never);

    await component.loginWithGoogle();

    expect(signInWithPopup).toHaveBeenCalledWith(component.auth, expect.anything());
    expect(setAuthenticated).toHaveBeenCalledWith(true);
  });

  it('loginWithMicrosoft signs in via popup and marks the user authenticated', async () => {
    const { component, setAuthenticated } = setup();
    vi.mocked(signInWithPopup).mockResolvedValue({} as never);

    await component.loginWithMicrosoft();

    expect(signInWithPopup).toHaveBeenCalledWith(component.auth, expect.anything());
    expect(setAuthenticated).toHaveBeenCalledWith(true);
  });

  it('logout marks the user unauthenticated and signs out', async () => {
    const { component, setAuthenticated } = setup();

    await component.logout();

    expect(setAuthenticated).toHaveBeenCalledWith(false);
    expect(signOut).toHaveBeenCalledWith(component.auth);
  });

  it('redirects and reloads when the user becomes authenticated', async () => {
    const { fixture, isAuthenticated, navigate } = setup();

    isAuthenticated.set(true);
    fixture.detectChanges();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(navigate).toHaveBeenCalledWith(['features']);
    expect(window.location.reload).toHaveBeenCalled();
  });
});
