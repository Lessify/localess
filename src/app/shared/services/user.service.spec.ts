import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

// @angular/fire/firestore and @angular/fire/functions are mocked globally in src/test-setup.ts.
import { collectionData, deleteDoc, deleteField, docData, Firestore, updateDoc } from '@angular/fire/firestore';
import { Functions, httpsCallableData } from '@angular/fire/functions';
import { firstValueFrom, of } from 'rxjs';

import { User, UserInvite, UserUpdate } from '../models/user.model';
import { UserService } from './user.service';

describe('UserService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function setup() {
    TestBed.configureTestingModule({ providers: [{ provide: Firestore, useValue: {} }, { provide: Functions, useValue: {} }] });
    return TestBed.inject(UserService);
  }

  it('findAll() reads the users collection', async () => {
    const service = setup();
    const users: User[] = [{ id: 'u1' } as unknown as User];
    vi.mocked(collectionData).mockReturnValue(of(users));

    const result = await firstValueFrom(service.findAll());

    expect(result).toEqual(users);
    expect(collectionData).toHaveBeenCalledWith({ path: 'mock-collection-ref' }, { idField: 'id' });
  });

  it('findById() reads the user doc at the expected path', async () => {
    const service = setup();
    const user: User = { id: 'u1' } as unknown as User;
    vi.mocked(docData).mockReturnValue(of(user));

    const result = await firstValueFrom(service.findById('u1'));

    expect(result).toEqual(user);
  });

  it('update() sets role/permissions/lock for a custom role', async () => {
    const service = setup();
    const model: UserUpdate = { role: 'custom', permissions: [], lock: true };

    await firstValueFrom(service.update('u1', model));

    const [, updatedFields] = vi.mocked(updateDoc).mock.calls[0];
    expect(updatedFields).toMatchObject({ role: 'custom', permissions: [], lock: true });
  });

  it('update() defaults lock to false for a custom role when not provided', async () => {
    const service = setup();
    const model: UserUpdate = { role: 'custom', permissions: [] };

    await firstValueFrom(service.update('u1', model));

    const [, updatedFields] = vi.mocked(updateDoc).mock.calls[0];
    expect(updatedFields).toMatchObject({ lock: false });
  });

  it('update() clears permissions/lock for an admin role', async () => {
    const service = setup();
    const model: UserUpdate = { role: 'admin' };

    await firstValueFrom(service.update('u1', model));

    const [, updatedFields] = vi.mocked(updateDoc).mock.calls[0];
    expect(updatedFields).toMatchObject({ role: 'admin', permissions: deleteField(), lock: deleteField() });
  });

  it('update() clears role/permissions/lock when role is undefined', async () => {
    const service = setup();
    const model: UserUpdate = { role: undefined };

    await firstValueFrom(service.update('u1', model));

    const [, updatedFields] = vi.mocked(updateDoc).mock.calls[0];
    expect(updatedFields).toMatchObject({ role: deleteField(), permissions: deleteField(), lock: deleteField() });
  });

  it('delete() deletes the user doc at the expected path', async () => {
    const service = setup();

    await firstValueFrom(service.delete('u1'));

    expect(deleteDoc).toHaveBeenCalledWith({ path: 'mock-doc-ref' });
  });

  it('invite() calls the user-invite callable with the model', async () => {
    const service = setup();
    const callable = vi.fn().mockReturnValue(of(undefined));
    vi.mocked(httpsCallableData).mockReturnValue(callable);
    const model: UserInvite = { email: 'a@b.com', password: 'secret' };

    await firstValueFrom(service.invite(model));

    expect(httpsCallableData).toHaveBeenCalledWith(expect.anything(), 'user-invite');
    expect(callable).toHaveBeenCalledWith(model);
  });

  it('sync() calls the user-sync callable', async () => {
    const service = setup();
    const callable = vi.fn().mockReturnValue(of(undefined));
    vi.mocked(httpsCallableData).mockReturnValue(callable);

    await firstValueFrom(service.sync());

    expect(httpsCallableData).toHaveBeenCalledWith(expect.anything(), 'user-sync');
    expect(callable).toHaveBeenCalledWith();
  });
});
