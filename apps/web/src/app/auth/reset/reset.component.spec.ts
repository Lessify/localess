import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AppConfigService, DEFAULT_APP_CONFIG } from '@core/api/app-config.service';

import { ResetComponent } from './reset.component';

describe('ResetComponent', () => {
  let http: HttpTestingController;

  function setup(passwordResetByEmail = true) {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AppConfigService,
          useValue: { config: signal({ ...DEFAULT_APP_CONFIG, auth: { ...DEFAULT_APP_CONFIG.auth, passwordResetByEmail } }) },
        },
      ],
    });
    TestBed.overrideComponent(ResetComponent, { set: { template: '<div></div>' } });
    const fixture = TestBed.createComponent(ResetComponent);
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
    return fixture.componentInstance;
  }

  afterEach(() => http.verify());

  it('form is invalid when empty, and invalid for a non-email value', () => {
    const component = setup();
    expect(component.form.invalid).toBe(true);
    component.form.setValue({ email: 'not-an-email' });
    expect(component.form.invalid).toBe(true);
    component.form.setValue({ email: 'user@example.com' });
    expect(component.form.valid).toBe(true);
  });

  it('requests the reset email, then shows the confirmation', () => {
    const component = setup();
    component.form.setValue({ email: 'user@example.com' });
    component.passwordReset();
    const request = http.expectOne({ method: 'POST', url: '/api/auth/password-reset/request' });
    expect(request.request.body).toEqual({ email: 'user@example.com' });
    request.flush(null);
    expect(component.sent()).toBe(true);
    expect(component.form.value.email).toBeNull();
  });

  it('knows when the server cannot send reset emails', () => {
    expect(setup(false).byEmail()).toBe(false);
  });
});
