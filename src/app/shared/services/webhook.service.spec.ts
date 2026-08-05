import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

// @angular/fire/firestore is mocked globally in src/test-setup.ts.
import { addDoc, collectionData, deleteDoc, docData, Firestore, updateDoc } from '@angular/fire/firestore';
import { firstValueFrom, of } from 'rxjs';

import { WebHook, WebHookCreate, WebHookEvent, WebHookLog, WebHookUpdate } from '../models/webhook.model';
import { WebHookService } from './webhook.service';

describe('WebHookService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function setup() {
    TestBed.configureTestingModule({ providers: [{ provide: Firestore, useValue: {} }] });
    return TestBed.inject(WebHookService);
  }

  it('findAll() reads the space webhooks collection ordered by name asc', async () => {
    const service = setup();
    const webhooks: WebHook[] = [{ id: 'w1', name: 'Slack', url: 'https://x', enabled: true, events: [] } as unknown as WebHook];
    vi.mocked(collectionData).mockReturnValue(of(webhooks));

    const result = await firstValueFrom(service.findAll('space-1'));

    expect(result).toEqual(webhooks);
    expect(collectionData).toHaveBeenCalledWith(
      { ref: { path: 'mock-collection-ref' }, constraints: [{ type: 'orderBy', field: 'name', direction: 'asc' }] },
      { idField: 'id' },
    );
  });

  it('findById() reads the webhook doc at the expected path', async () => {
    const service = setup();
    const webhook: WebHook = { id: 'w1', name: 'Slack', url: 'https://x', enabled: true, events: [] } as unknown as WebHook;
    vi.mocked(docData).mockReturnValue(of(webhook));

    const result = await firstValueFrom(service.findById('space-1', 'w1'));

    expect(result).toEqual(webhook);
  });

  it('create() always sets enabled true and omits headers/secret when not provided, returning the new id', async () => {
    const service = setup();
    vi.mocked(addDoc).mockResolvedValue({ id: 'new-webhook' } as never);
    const entity: WebHookCreate = { name: 'Slack', url: 'https://x', events: [WebHookEvent.CONTENT_PUBLISHED] };

    const result = await firstValueFrom(service.create('space-1', entity));

    expect(result).toBe('new-webhook');
    const [, addedEntity] = vi.mocked(addDoc).mock.calls[0];
    expect(addedEntity).toMatchObject({ name: 'Slack', url: 'https://x', enabled: true, events: entity.events });
    expect(addedEntity).not.toHaveProperty('headers');
    expect(addedEntity).not.toHaveProperty('secret');
  });

  it('create() includes headers/secret when provided', async () => {
    const service = setup();
    vi.mocked(addDoc).mockResolvedValue({ id: 'new-webhook' } as never);
    const entity: WebHookCreate = {
      name: 'Slack',
      url: 'https://x',
      events: [],
      headers: { 'X-Test': '1' },
      secret: 'shh',
    };

    await firstValueFrom(service.create('space-1', entity));

    const [, addedEntity] = vi.mocked(addDoc).mock.calls[0];
    expect(addedEntity).toMatchObject({ headers: { 'X-Test': '1' }, secret: 'shh' });
  });

  it('update() omits headers/secret from the update when not provided', async () => {
    const service = setup();
    const entity: WebHookUpdate = { name: 'Renamed', url: 'https://y', events: [] };

    await firstValueFrom(service.update('space-1', 'w1', entity));

    const [, updatedFields] = vi.mocked(updateDoc).mock.calls[0];
    expect(updatedFields).toMatchObject({ name: 'Renamed', url: 'https://y' });
    expect(updatedFields).not.toHaveProperty('headers');
    expect(updatedFields).not.toHaveProperty('secret');
  });

  it('updateStatus() updates only the enabled flag', async () => {
    const service = setup();

    await firstValueFrom(service.updateStatus('space-1', 'w1', false));

    const [, updatedFields] = vi.mocked(updateDoc).mock.calls[0];
    expect(updatedFields).toMatchObject({ enabled: false });
  });

  it('delete() deletes the webhook doc at the expected path', async () => {
    const service = setup();

    await firstValueFrom(service.delete('space-1', 'w1'));

    expect(deleteDoc).toHaveBeenCalledWith({ path: 'mock-doc-ref' });
  });

  it('findLogs() orders by createdAt desc and omits the limit constraint when max is not given', async () => {
    const service = setup();
    vi.mocked(collectionData).mockReturnValue(of([] as WebHookLog[]));

    await firstValueFrom(service.findLogs('space-1', 'w1'));

    expect(collectionData).toHaveBeenCalledWith(
      { ref: { path: 'mock-collection-ref' }, constraints: [{ type: 'orderBy', field: 'createdAt', direction: 'desc' }] },
      { idField: 'id' },
    );
  });

  it('findLogs() adds a limit constraint when max is given', async () => {
    const service = setup();
    vi.mocked(collectionData).mockReturnValue(of([] as WebHookLog[]));

    await firstValueFrom(service.findLogs('space-1', 'w1', 10));

    expect(collectionData).toHaveBeenCalledWith(
      {
        ref: { path: 'mock-collection-ref' },
        constraints: [
          { type: 'orderBy', field: 'createdAt', direction: 'desc' },
          { type: 'limit', n: 10 },
        ],
      },
      { idField: 'id' },
    );
  });
});
