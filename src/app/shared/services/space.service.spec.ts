import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

// @angular/fire/firestore and @angular/fire/functions are mocked globally in src/test-setup.ts.
import { addDoc, collectionData, deleteDoc, docData, Firestore, updateDoc } from '@angular/fire/firestore';
import { Functions, httpsCallableData } from '@angular/fire/functions';
import { firstValueFrom, of } from 'rxjs';

import { Space, SpaceCreate, SpaceEnvironment, SpaceUpdate } from '../models/space.model';
import { SpaceService } from './space.service';

describe('SpaceService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function setup() {
    TestBed.configureTestingModule({ providers: [{ provide: Firestore, useValue: {} }, { provide: Functions, useValue: {} }] });
    return TestBed.inject(SpaceService);
  }

  it('findAll() reads the spaces collection ordered by name asc', async () => {
    const service = setup();
    const spaces: Space[] = [{ id: 's1', name: 'Space 1' } as unknown as Space];
    vi.mocked(collectionData).mockReturnValue(of(spaces));

    const result = await firstValueFrom(service.findAll());

    expect(result).toEqual(spaces);
    expect(collectionData).toHaveBeenCalledWith(
      { ref: { path: 'mock-collection-ref' }, constraints: [{ type: 'orderBy', field: 'name', direction: 'asc' }] },
      { idField: 'id' },
    );
  });

  it('findById() reads the space doc at the expected path', async () => {
    const service = setup();
    const space: Space = { id: 's1', name: 'Space 1' } as unknown as Space;
    vi.mocked(docData).mockReturnValue(of(space));

    const result = await firstValueFrom(service.findById('s1'));

    expect(result).toEqual(space);
  });

  it('create() adds a space with a default English locale', async () => {
    const service = setup();
    vi.mocked(addDoc).mockResolvedValue({ id: 'new-space' } as never);
    const entity: SpaceCreate = { name: 'New Space' };

    await firstValueFrom(service.create(entity));

    const [, addedEntity] = vi.mocked(addDoc).mock.calls[0];
    expect(addedEntity).toMatchObject({
      name: 'New Space',
      locales: [{ id: 'en', name: 'English' }],
      localeFallback: { id: 'en', name: 'English' },
    });
  });

  it('update() sets the space name', async () => {
    const service = setup();
    const entity: SpaceUpdate = { name: 'Renamed' };

    await firstValueFrom(service.update('s1', entity));

    const [, updatedFields] = vi.mocked(updateDoc).mock.calls[0];
    expect(updatedFields).toMatchObject({ name: 'Renamed' });
  });

  it('updateEnvironments() sets the environments list', async () => {
    const service = setup();
    const environments: SpaceEnvironment[] = [{ name: 'prod', url: 'https://prod' }];

    await firstValueFrom(service.updateEnvironments('s1', environments));

    const [, updatedFields] = vi.mocked(updateDoc).mock.calls[0];
    expect(updatedFields).toMatchObject({ environments });
  });

  it('delete() deletes the space doc at the expected path', async () => {
    const service = setup();

    await firstValueFrom(service.delete('s1'));

    expect(deleteDoc).toHaveBeenCalledWith({ path: 'mock-doc-ref' });
  });

  it('calculateOverview() calls the space-calculateoverview callable with the spaceId', async () => {
    const service = setup();
    const callable = vi.fn().mockReturnValue(of(undefined));
    vi.mocked(httpsCallableData).mockReturnValue(callable);

    await firstValueFrom(service.calculateOverview('s1'));

    expect(httpsCallableData).toHaveBeenCalledWith(expect.anything(), 'space-calculateoverview');
    expect(callable).toHaveBeenCalledWith({ spaceId: 's1' });
  });
});
