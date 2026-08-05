import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

// @angular/fire/auth is mocked globally in src/test-setup.ts.
import { Auth, updateEmail, updatePassword, updateProfile } from '@angular/fire/auth';
import { firstValueFrom } from 'rxjs';

import { MeService } from './me.service';

describe('MeService', () => {
  function setup() {
    const reload = vi.fn().mockResolvedValue(undefined);
    const currentUser = { uid: 'user-1', reload };
    TestBed.configureTestingModule({ providers: [{ provide: Auth, useValue: { currentUser } }] });
    return { service: TestBed.inject(MeService), currentUser, reload };
  }

  it('updateProfile calls the auth updateProfile function with the current user and reloads the user', async () => {
    const { service, currentUser, reload } = setup();

    await firstValueFrom(service.updateProfile({ displayName: 'New Name' }));

    expect(updateProfile).toHaveBeenCalledWith(currentUser, { displayName: 'New Name' });
    expect(reload).toHaveBeenCalled();
  });

  it('updateEmail calls the auth updateEmail function with the current user and reloads the user', async () => {
    const { service, currentUser, reload } = setup();

    await firstValueFrom(service.updateEmail('new@example.com'));

    expect(updateEmail).toHaveBeenCalledWith(currentUser, 'new@example.com');
    expect(reload).toHaveBeenCalled();
  });

  it('updatePassword calls the auth updatePassword function with the current user, without reloading', async () => {
    const { service, currentUser, reload } = setup();

    await firstValueFrom(service.updatePassword('new-password'));

    expect(updatePassword).toHaveBeenCalledWith(currentUser, 'new-password');
    expect(reload).not.toHaveBeenCalled();
  });
});
