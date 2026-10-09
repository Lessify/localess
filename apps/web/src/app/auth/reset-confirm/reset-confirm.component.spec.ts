import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ResetConfirmComponent } from './reset-confirm.component';

describe('ResetConfirmComponent', () => {
  let http: HttpTestingController;

  function setup(token?: string) {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    TestBed.overrideComponent(ResetConfirmComponent, { set: { template: '<div></div>' } });
    const fixture = TestBed.createComponent(ResetConfirmComponent);
    fixture.componentRef.setInput('token', token);
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
    return fixture.componentInstance;
  }

  afterEach(() => http.verify());

  it('requires matching passwords of at least 6 characters', () => {
    const component = setup('t0k3n');
    component.form.setValue({ password: 'short', confirm: 'short' });
    expect(component.form.invalid).toBe(true);
    component.form.setValue({ password: 'long enough', confirm: 'different' });
    component.form.controls.confirm.updateValueAndValidity();
    expect(component.form.controls.confirm.hasError('mismatch')).toBe(true);
    component.form.setValue({ password: 'long enough', confirm: 'long enough' });
    component.form.controls.confirm.updateValueAndValidity();
    expect(component.form.valid).toBe(true);
  });

  it('sends the token with the new password', () => {
    const component = setup('t0k3n');
    component.form.setValue({ password: 'new password', confirm: 'new password' });
    component.submit();
    const request = http.expectOne({ method: 'POST', url: '/api/auth/password-reset/confirm' });
    expect(request.request.body).toEqual({ token: 't0k3n', password: 'new password' });
    request.flush(null);
    expect(component.done()).toBe(true);
  });

  it('explains an expired or reused link', () => {
    const component = setup('old');
    component.form.setValue({ password: 'new password', confirm: 'new password' });
    component.submit();
    http.expectOne('/api/auth/password-reset/confirm').flush({}, { status: 400, statusText: 'Bad Request' });
    expect(component.error()).toMatch(/invalid or has expired/);
    expect(component.done()).toBe(false);
  });

  it('does nothing without a token', () => {
    const component = setup(undefined);
    component.form.setValue({ password: 'new password', confirm: 'new password' });
    component.submit();
    http.expectNone('/api/auth/password-reset/confirm');
  });
});
