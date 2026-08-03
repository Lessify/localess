import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { UserStore } from '@shared/stores/user.store';
import { vi } from 'vitest';

import { environment } from '../../../environments/environment';
import { LoginComponent } from './login.component';

// NOTE: this spec intentionally does not `vi.mock('@angular/fire/auth', ...)`. Doing so here
// crashes ("Cannot access '__vi_import_N__' before initialization") whenever this file and
// `shared/stores/user.store.spec.ts` run in the same Vitest process — both transitively share
// `user.store.ts`, and the Angular Vitest builder's chunk-splitting cannot reconcile one spec
// mocking '@angular/fire/auth' while the other imports the real `Auth` token for DI faking.
// This was confirmed empirically (isolated runs of either file pass; running them together
// fails consistently, independent of mock content or sync/async factory style). As a result,
// `loginWithEmailAndPassword`'s success/error paths, `loginWithGoogle`, `loginWithMicrosoft`,
// and `logout` — all of which need `signInWithEmailAndPassword`/`signInWithPopup`/`signOut`
// intercepted — are not covered here. `signInWithPopup` specifically cannot be fully fake
// via a plain DI object either: it fails with a real "auth/operation-not-supported-in-this-
// environment" error before ever reaching the given Auth object.
describe('LoginComponent', () => {
  let originalReload: typeof window.location.reload;

  beforeEach(() => {
    localStorage.clear();
    originalReload = window.location.reload;
    window.location.reload = vi.fn();
  });

  afterEach(() => {
    window.location.reload = originalReload;
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

    // Cannot assert non-invocation of the real signInWithEmailAndPassword directly (no vi.mock,
    // see the file-level note) — instead confirm the method completes cleanly with no side
    // effects, which would not hold if the early-return guard were removed and the (unmocked,
    // bare `{}` Auth) call were attempted and its rejection mishandled.
    await expect(component.loginWithEmailAndPassword()).resolves.toBeUndefined();

    expect(setAuthenticated).not.toHaveBeenCalled();
    expect(component.hasAuthError()).toBe(false);
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
