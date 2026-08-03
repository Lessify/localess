import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

vi.mock('@angular/fire/auth', async () => {
  const actual = await vi.importActual<typeof import('@angular/fire/auth')>('@angular/fire/auth');
  return { ...actual, sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined) };
});

import { Auth, sendPasswordResetEmail } from '@angular/fire/auth';
import { Router } from '@angular/router';

import { ResetComponent } from './reset.component';

describe('ResetComponent', () => {
  function setup() {
    const navigate = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({
      providers: [
        { provide: Auth, useValue: {} },
        { provide: Router, useValue: { navigate } },
      ],
    });
    TestBed.overrideComponent(ResetComponent, { set: { template: '<div></div>' } });
    const fixture = TestBed.createComponent(ResetComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, navigate };
  }

  it('form is invalid when empty, and invalid for a non-email value', () => {
    const { component } = setup();
    expect(component.form.invalid).toBe(true);

    component.form.setValue({ email: 'not-an-email' });
    expect(component.form.invalid).toBe(true);

    component.form.setValue({ email: 'user@example.com' });
    expect(component.form.valid).toBe(true);
  });

  it('passwordReset sends the reset email, resets the form, and navigates to login', async () => {
    const { component, navigate } = setup();
    component.form.setValue({ email: 'user@example.com' });

    await component.passwordReset();

    expect(sendPasswordResetEmail).toHaveBeenCalledWith({}, 'user@example.com');
    expect(component.form.value.email).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['auth', 'login']);
  });
});
