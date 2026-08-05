import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

// @angular/fire/firestore is mocked globally in src/test-setup.ts.
import { addDoc, collectionData, deleteDoc, deleteField, docData, updateDoc } from '@angular/fire/firestore';
import { Firestore } from '@angular/fire/firestore';
import { firstValueFrom, of } from 'rxjs';

import { Token, TokenForm, TokenPermission } from '../models/token.model';
import { TokenService } from './token.service';

describe('TokenService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function setup() {
    TestBed.configureTestingModule({ providers: [{ provide: Firestore, useValue: {} }] });
    return TestBed.inject(TokenService);
  }

  it('findAll() reads the space tokens collection ordered by createdAt desc', async () => {
    const service = setup();
    const tokens: Token[] = [{ id: 't1', name: 'Token 1', version: 2, permissions: [] } as unknown as Token];
    vi.mocked(collectionData).mockReturnValue(of(tokens));

    const result = await firstValueFrom(service.findAll('space-1'));

    expect(result).toEqual(tokens);
    expect(collectionData).toHaveBeenCalledWith(
      { ref: { path: 'mock-collection-ref' }, constraints: [{ type: 'orderBy', field: 'createdAt', direction: 'desc' }] },
      { idField: 'id' },
    );
  });

  it('findFirst() limits the query to 1 result', async () => {
    const service = setup();
    vi.mocked(collectionData).mockReturnValue(of([]));

    await firstValueFrom(service.findFirst('space-1'));

    expect(collectionData).toHaveBeenCalledWith(
      { ref: { path: 'mock-collection-ref' }, constraints: [{ type: 'limit', n: 1 }] },
      { idField: 'id' },
    );
  });

  it('findFirstByPermission() filters by array-contains permission and limits to 1', async () => {
    const service = setup();
    vi.mocked(collectionData).mockReturnValue(of([]));

    await firstValueFrom(service.findFirstByPermission('space-1', TokenPermission.CONTENT_DRAFT));

    expect(collectionData).toHaveBeenCalledWith(
      {
        ref: { path: 'mock-collection-ref' },
        constraints: [
          { type: 'where', field: 'permissions', op: 'array-contains', value: TokenPermission.CONTENT_DRAFT },
          { type: 'limit', n: 1 },
        ],
      },
      { idField: 'id' },
    );
  });

  it('findById() reads the token doc at the expected path', async () => {
    const service = setup();
    const token: Token = { id: 't1', name: 'Token 1', version: 2, permissions: [] } as unknown as Token;
    vi.mocked(docData).mockReturnValue(of(token));

    const result = await firstValueFrom(service.findById('space-1', 't1'));

    expect(result).toEqual(token);
  });

  it('create() adds a token with version 2 and omits cacheTtl when not provided', async () => {
    const service = setup();
    vi.mocked(addDoc).mockResolvedValue({ id: 'new-token' } as never);
    const model: TokenForm = { name: 'CI token', permissions: [TokenPermission.CONTENT_DRAFT] };

    await firstValueFrom(service.create('space-1', model));

    const [, addedEntity] = vi.mocked(addDoc).mock.calls[0];
    expect(addedEntity).toMatchObject({ version: 2, name: 'CI token', permissions: model.permissions });
    expect(addedEntity).not.toHaveProperty('cacheTtl');
  });

  it('create() includes cacheTtl when provided', async () => {
    const service = setup();
    vi.mocked(addDoc).mockResolvedValue({ id: 'new-token' } as never);
    const model: TokenForm = { name: 'CI token', permissions: [], cacheTtl: 3600 };

    await firstValueFrom(service.create('space-1', model));

    const [, addedEntity] = vi.mocked(addDoc).mock.calls[0];
    expect(addedEntity).toMatchObject({ cacheTtl: 3600 });
  });

  it('update() deletes the cacheTtl field when the model omits it', async () => {
    const service = setup();
    const model: TokenForm = { name: 'Renamed', permissions: [] };

    await firstValueFrom(service.update('space-1', 't1', model));

    const [, updatedFields] = vi.mocked(updateDoc).mock.calls[0];
    expect(updatedFields).toMatchObject({ name: 'Renamed', cacheTtl: deleteField() });
  });

  it('update() sets cacheTtl when the model provides it', async () => {
    const service = setup();
    const model: TokenForm = { name: 'Renamed', permissions: [], cacheTtl: 60 };

    await firstValueFrom(service.update('space-1', 't1', model));

    const [, updatedFields] = vi.mocked(updateDoc).mock.calls[0];
    expect(updatedFields).toMatchObject({ cacheTtl: 60 });
  });

  it('delete() deletes the token doc at the expected path', async () => {
    const service = setup();

    await firstValueFrom(service.delete('space-1', 't1'));

    expect(deleteDoc).toHaveBeenCalledWith({ path: 'mock-doc-ref' });
  });
});
