import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { AppConfigService, DEFAULT_APP_CONFIG } from '@core/api/app-config.service';
import type { PublicAppConfig } from '@localess/shared';
import { UserStore } from '@core/stores/user.store';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let http: HttpTestingController;

  function setup(
    config: Partial<PublicAppConfig['auth']> = {},
    query: Record<string, string> = {},
    instance?: PublicAppConfig['instance'],
  ) {
    const signedIn = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AppConfigService,
          useValue: {
            config: signal({ ...DEFAULT_APP_CONFIG, auth: { ...DEFAULT_APP_CONFIG.auth, ...config }, ...(instance ? { instance } : {}) }),
          },
        },
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap(query)) } },
        { provide: UserStore, useValue: { signedIn, isAuthenticated: signal(false), email: signal(undefined) } },
      ],
    });
    TestBed.overrideComponent(LoginComponent, { set: { template: '<div></div>' } });
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
    const component = fixture.componentInstance;
    const redirect = vi.spyOn(component, 'redirect').mockImplementation(() => undefined);
    return { component, signedIn, redirect };
  }

  afterEach(() => http.verify());

  it('offers the providers and message the server reports', () => {
    const { component } = setup({ providers: ['GOOGLE'], loginMessage: 'Maintenance tonight' });
    expect(component.isGoogleAuthEnabled()).toBe(true);
    expect(component.isMicrosoftAuthEnabled()).toBe(false);
    expect(component.message()).toBe('Maintenance tonight');
  });

  it('has no instance label unless the installation has one', () => {
    expect(setup().component.instanceLabel()).toBeUndefined();
  });

  it('reads the instance label from the runtime config', () => {
    const { component } = setup({}, {}, { name: 'Test', color: 'destructive' });
    expect(component.instanceLabel()).toEqual({ name: 'Test', color: 'destructive' });
  });

  it('form is invalid when empty; valid once both fields have at least 2 characters', () => {
    const { component } = setup();
    expect(component.form.invalid).toBe(true);
    component.form.setValue({ email: 'ab', password: 'cd' });
    expect(component.form.valid).toBe(true);
  });

  it('signs in with email and password, stores the user and reloads into the app', () => {
    const { component, signedIn, redirect } = setup();
    component.form.setValue({ email: 'me@example.com', password: 'secret' });
    component.loginWithEmailAndPassword();
    const request = http.expectOne({ method: 'POST', url: '/api/auth/login' });
    expect(request.request.body).toEqual({ email: 'me@example.com', password: 'secret' });
    request.flush({ user: { id: 'u1', email: 'me@example.com', providers: ['password'] } });
    expect(signedIn).toHaveBeenCalledWith({ id: 'u1', email: 'me@example.com', providers: ['password'] });
    expect(redirect).toHaveBeenCalledWith('/features');
  });

  it('shows an error when the credentials are wrong', () => {
    const { component, signedIn, redirect } = setup();
    component.form.setValue({ email: 'me@example.com', password: 'nope' });
    component.loginWithEmailAndPassword();
    http.expectOne('/api/auth/login').flush({ message: 'Invalid email or password' }, { status: 401, statusText: 'Unauthorized' });
    expect(component.authError()).toBe('User or password is wrong');
    expect(component.pending()).toBe(false);
    expect(signedIn).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('says so when sign-in is rate limited (429), instead of blaming the password', () => {
    const { component, signedIn } = setup();
    component.form.setValue({ email: 'me@example.com', password: 'right-password' });
    component.loginWithEmailAndPassword();
    http.expectOne('/api/auth/login').flush({ message: 'Rate limit exceeded' }, { status: 429, statusText: 'Too Many Requests' });
    expect(component.authError()).toBe('Too many sign-in attempts. Try again in a minute.');
    expect(component.pending()).toBe(false);
    expect(signedIn).not.toHaveBeenCalled();
  });

  it('does nothing when the form is empty', () => {
    const { component } = setup();
    component.loginWithEmailAndPassword();
    http.expectNone('/api/auth/login');
  });

  it('redirects to the provider sign-in', () => {
    const { component, redirect } = setup({ providers: ['GOOGLE', 'MICROSOFT'] });
    component.loginWith('microsoft');
    expect(redirect).toHaveBeenCalledWith('/api/auth/oauth/microsoft?returnTo=%2Ffeatures');
  });

  it('explains provider sign-in errors passed back as ?error=', () => {
    expect(setup({}, { error: 'no-account' }).component.oauthError()).toMatch(/no Localess account/);
  });

  it('falls back to a generic message for unknown error codes', () => {
    expect(setup({}, { error: 'weird' }).component.oauthError()).toMatch(/failed/);
  });
});
